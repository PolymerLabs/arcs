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

import arcs.core.storage.Driver
import arcs.core.storage.DriverFactory
import arcs.core.storage.DriverProvider
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.type.Type
import kotlin.reflect.KClass

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
        dataClass: KClass<Data>,
        type: Type
    ): Driver<Data> {
        require(willSupport(storageKey)) {
            "This provider does not support StorageKey: $storageKey"
        }
        return VolatileDriver(storageKey, type, RamDisk.memory)
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

    /* internal */ fun addListener(listener: (StorageKey, Any?) -> Unit) =
        memory.addListener(listener)

    /* internal */ fun removeListener(listener: (StorageKey, Any?) -> Unit) =
        memory.removeListener(listener)

    /** Clears every piece of data from the [RamDisk] memory. */
    fun clear() = memory.clear()
}
