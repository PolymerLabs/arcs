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

import arcs.core.data.Capabilities
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.Driver
import arcs.core.storage.DriverFactory
import arcs.core.storage.DriverProvider
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import kotlin.reflect.KClass

/** Protocol to be used with the ramdisk driver. */
const val RAMDISK_DRIVER_PROTOCOL = "ramdisk"

/** Storage key for a piece of data managed by the ramdisk driver. */
data class RamDiskStorageKey(private val unique: String) : StorageKey(RAMDISK_DRIVER_PROTOCOL) {
    override fun toKeyString(): String = unique

    override fun childKeyWithComponent(component: String): StorageKey =
        RamDiskStorageKey("$unique/$component")

    override fun toString(): String = super.toString()

    companion object {
        private val RAMDISK_STORAGE_KEY_PATTERN = "^(.*)\$".toRegex()

        init {
            // When RamDiskStorageKey is imported, this will register its parser with the storage
            // key parsers.
            StorageKeyParser.addParser(RAMDISK_DRIVER_PROTOCOL, ::fromString)
        }

        fun registerParser() {
            StorageKeyParser.addParser(RAMDISK_DRIVER_PROTOCOL, ::fromString)
        }

        private fun fromString(rawKeyString: String): RamDiskStorageKey {
            val match =
                requireNotNull(RAMDISK_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)) {
                    "Not a valid VolatileStorageKey: $rawKeyString"
                }

            return RamDiskStorageKey(match.groupValues[1])
        }
    }
}

/**
 * Provides RamDisk storage drivers.
 *
 * RamDisk storage is shared amongst all Arcs in the same process, and will persist for as long as
 * the Arcs Runtime does.
 *
 * This works in the exact same way as Volatile storage, but the memory is not tied to a specific
 * running Arc.
 */
class RamDiskDriverProvider : DriverProvider {
    init {
        DriverFactory.register(this)
    }

    override fun willSupport(storageKey: StorageKey): Boolean = storageKey is RamDiskStorageKey

    override suspend fun <Data : Any> getDriver(
        storageKey: StorageKey,
        dataClass: KClass<Data>
    ): Driver<Data> {
        require(willSupport(storageKey)) {
            "This provider does not support StorageKey: $storageKey"
        }
        return VolatileDriver(storageKey, RamDisk.memory)
    }

    /*
     * These ensure that if/when RamDiskDriverProvider is placed in a set, or used as a key for a
     * map, it's only used once.
     */

    override fun equals(other: Any?): Boolean = other is RamDiskDriverProvider
    override fun hashCode(): Int = this::class.hashCode()
}

/** Singleton, for maintaining a single [VolatileMemory] reference to be shared across all arcs. */
object RamDisk {
    /* internal */ val memory = VolatileMemory()

    init {
        CapabilitiesResolver.registerKeyCreator(
            RAMDISK_DRIVER_PROTOCOL,
            Capabilities.TiedToRuntime
        ) { storageKeyOptions -> RamDiskStorageKey(storageKeyOptions.unique) }
    }
    /** Clears every piece of data from the [RamDisk] memory. */
    fun clear() = memory.clear()
}
