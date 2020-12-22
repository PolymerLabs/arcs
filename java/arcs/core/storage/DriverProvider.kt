package arcs.core.storage

import kotlin.reflect.KClass

/** Provider of information on the [Driver] and characteristics of the storage behind it. */
interface DriverProvider {
  /** Returns whether or not the driver will support data keyed by the [storageKey]. */
  fun willSupport(storageKey: StorageKey): Boolean

  /** Gets a [Driver] for the given [storageKey] and type [Data] (declared by [dataClass]). */
  suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>
  ): Driver<Data>

  /**
   * Remove all stored entities. Some implementations may leave tombstones with ID and
   * version maps.
   */
  suspend fun removeAllEntities()

  /**
   * Remove all entities created in the given time range. Some implementations may leave tombstones
   * with ID and version maps.
   */
  suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long)

  /**
   * @param inMemory if true, return count of entities stored in-memory, otherwise return count
   * of entities stored on-disk.
   */
  suspend fun getEntitiesCount(inMemory: Boolean): Long = 0

  /**
   * @param inMemory if true, return bytes stored in-memory, otherwise return bytes
   * stored on-disk.
   */
  suspend fun getStorageSize(inMemory: Boolean): Long = 0

  /**
   * Returns if the current storage is too large, i.e. the storage used by this driver is
   * larger than a threshold.
   */
  suspend fun isStorageTooLarge(): Boolean = false
}
