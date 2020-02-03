/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage.driver

import arcs.core.common.ArcId
import arcs.core.common.toArcId
import arcs.core.storage.Driver
import arcs.core.storage.DriverFactory
import arcs.core.storage.DriverProvider
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.core.util.Random
import arcs.core.util.TaggedLog
import kotlin.reflect.KClass
import kotlinx.atomicfu.atomic

/** Protocol to be used with the volatile driver. */
const val VOLATILE_DRIVER_PROTOCOL = "volatile"

/** Storage key for a piece of data kept in the volatile driver. */
data class VolatileStorageKey(
    /** Id of the arc where this key was created. */
    val arcId: ArcId,
    /** Unique identifier for this particular key. */
    val unique: String
) : StorageKey(VOLATILE_DRIVER_PROTOCOL) {
    override fun toKeyString(): String = "$arcId/$unique"

    override fun childKeyWithComponent(component: String): StorageKey =
        VolatileStorageKey(arcId, "$unique/$component")

    override fun toString(): String = super.toString()

    companion object {
        private val VOLATILE_STORAGE_KEY_PATTERN = "^([^/]+)/(.*)\$".toRegex()

        init {
            // When VolatileStorageKey is imported, this will register its parser with the storage
            // key parsers.
            StorageKeyParser.addParser(VOLATILE_DRIVER_PROTOCOL, ::fromString)
        }

        fun registerParser() {
            StorageKeyParser.addParser(VOLATILE_DRIVER_PROTOCOL, ::fromString)
        }

        private fun fromString(rawKeyString: String): VolatileStorageKey {
            val match =
                requireNotNull(VOLATILE_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)) {
                    "Not a valid VolatileStorageKey: $rawKeyString"
                }

            return VolatileStorageKey(match.groupValues[1].toArcId(), match.groupValues[2])
        }
    }
}

/** [DriverProvider] of [VolatileDriver]s for an arc. */
data class VolatileDriverProvider(private val arcId: ArcId) : DriverProvider {
    private val arcMemory = VolatileMemory()

    init {
        DriverFactory.register(this)
    }

    override fun willSupport(storageKey: StorageKey): Boolean =
        storageKey is VolatileStorageKey && storageKey.arcId == arcId

    override suspend fun <Data : Any> getDriver(
        storageKey: StorageKey,
        existenceCriteria: ExistenceCriteria,
        dataClass: KClass<Data>
    ): Driver<Data> {
        require(
            willSupport(storageKey)
        ) { "This provider does not support storageKey: $storageKey" }
        return VolatileDriver(storageKey, existenceCriteria, arcMemory)
    }
}

/** [Driver] implementation for an in-memory store of data. */
/* internal */ class VolatileDriver<Data : Any>(
    override val storageKey: StorageKey,
    override val existenceCriteria: ExistenceCriteria,
    private val memory: VolatileMemory
) : Driver<Data> {
    private val log = TaggedLog { this.toString() }
    // The identifier is simply used to help differentiate between VolatileDrivers for the same
    // storage key.
    private val identifier = nextIdentifier.incrementAndGet()
    /* internal */ var receiver: (suspend (data: Data, version: Int) -> Unit)? = null
    private var pendingModel: Data? = null
    private var pendingVersion: Int = 0

    override val token: String?
        get() = memory.token

    init {
        require(
            // VolatileDriver does double-duty: serving both Volatile and RamDisk purposes, just
            // with different policies on which instances of VolatileMemory they point at.
            storageKey is VolatileStorageKey || storageKey is RamDiskStorageKey
        ) { "Invalid storage key type: $storageKey" }

        val dataForCriteria: VolatileEntry<Data> = when (existenceCriteria) {
            ExistenceCriteria.ShouldCreate -> {
                require(storageKey !in memory) {
                    "Requested creation of memory loc $storageKey can't proceed: already exists"
                }
                VolatileEntry()
            }
            ExistenceCriteria.ShouldExist ->
                requireNotNull(memory.get<Data>(storageKey)) {
                    "Requested connection to memory location $storageKey failed: doesn't exist"
                }.also {
                    pendingModel = it.data
                    pendingVersion = it.version
                }
            ExistenceCriteria.MayExist -> {
                val preExisting =
                    memory.get<Data>(storageKey)?.also {
                        pendingModel = it.data
                        pendingVersion = it.version
                    }

                // If we had a pre-existing value, return it. Otherwise make an empty one and put it
                // in the memory.
                preExisting ?: VolatileEntry()
            }
        }

        // Add the data to the memory.
        memory[storageKey] = dataForCriteria.copy(drivers = dataForCriteria.drivers + this)
        log.debug { "Created" }
    }

    override suspend fun registerReceiver(
        token: String?,
        receiver: suspend (data: Data, version: Int) -> Unit
    ) {
        this.receiver = receiver
        this.pendingModel
            ?.takeIf { this.token != token }
            ?.let { receiver(it, pendingVersion) }
        this.pendingModel = null
    }

    override suspend fun send(data: Data, version: Int): Boolean {
        log.debug { "send($data, $version)" }
        val currentEntry: VolatileEntry<Data> = memory[storageKey]!!

        // If the new version isn't immediately after this one, return false.
        if (currentEntry.version != version - 1) return false

        val newEntry = VolatileEntry(data, version, currentEntry.drivers)
        memory[storageKey] = newEntry

        newEntry.drivers.forEach { driver ->
            val receiver = driver.takeIf { it != this }?.receiver
            log.debug { "Invoking receiver: $receiver" }
            receiver?.invoke(data, version)
        }

        return true
    }

    companion object {
        private var nextIdentifier = atomic(0)
    }
}

/** A single entry in a [VolatileDriver]. */
/* internal */ data class VolatileEntry<Data : Any>(
    val data: Data? = null,
    val version: Int = 0,
    val drivers: Set<VolatileDriver<Data>> = emptySet()
) {
    constructor(data: Data? = null, version: Int = 0, vararg drivers: VolatileDriver<Data>) :
        this(data, version, drivers.toSet())
}

/**
 * Lookup map of storage keys to entries, with a [token] that gets updated when data has changed.
 */
/* internal */ class VolatileMemory {
    private val lock = Any()
    private val entries = mutableMapOf<StorageKey, VolatileEntry<*>>()

    /** Current token. Will be updated with every call to [set]. */
    var token: String = Random.nextInt().toString()
        get() = synchronized(lock) { field }
        private set(value) = synchronized(lock) { field = value }

    /** Returns whether or not a [VolatileEntry] exists in memory for the [key]. */
    operator fun contains(key: StorageKey): Boolean = synchronized(lock) { key in entries }

    /**
     * Gets a [VolatileEntry] of type [Data] from the memory stored at [key], or null if not found.
     */
    @Suppress("UNCHECKED_CAST")
    operator fun <Data : Any> get(key: StorageKey): VolatileEntry<Data>? = synchronized(lock) {
        entries[key] as VolatileEntry<Data>?
    }

    /**
     * Sets the value at the provided [key] to the given [VolatileEntry] and returns the old value,
     * if a value was previously set.
     */
    @Suppress("UNCHECKED_CAST")
    operator fun <Data : Any> set(
        key: StorageKey,
        value: VolatileEntry<Data>
    ): VolatileEntry<Data>? = synchronized(lock) {
        val originalValue = entries[key]
        entries[key] = value
        token = Random.nextInt().toString()
        return originalValue as VolatileEntry<Data>?
    }

    /** Clears everything from storage. */
    fun clear() = entries.clear()
}
