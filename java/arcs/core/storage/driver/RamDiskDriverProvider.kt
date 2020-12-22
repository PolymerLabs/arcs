package arcs.core.storage.driver

import arcs.core.storage.Driver
import arcs.core.storage.DriverProvider
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.volatiles.VolatileDriverImpl
import arcs.core.storage.keys.RamDiskStorageKey
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
  override fun willSupport(storageKey: StorageKey): Boolean = storageKey is RamDiskStorageKey

  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>
  ): Driver<Data> {
    require(willSupport(storageKey)) {
      "This provider does not support StorageKey: $storageKey"
    }
    return VolatileDriverImpl.create(storageKey, RamDisk.memory)
  }

  /*
   * These ensure that if/when RamDiskDriverProvider is placed in a set, or used as a key for a
   * map, it's only used once.
   */

  override fun equals(other: Any?): Boolean = other is RamDiskDriverProvider
  override fun hashCode(): Int = this::class.hashCode()

  override suspend fun removeAllEntities() = RamDisk.clear()

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) =
    // RamDisk storage is opaque, so remove all entities.
    removeAllEntities()
}
