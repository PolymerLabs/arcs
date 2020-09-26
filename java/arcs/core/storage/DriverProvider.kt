package arcs.core.storage

import arcs.core.type.Type
import kotlin.reflect.KClass

/** Provider of information on the [Driver] and characteristics of the storage behind it. */
interface DriverProvider {
  /** Returns whether or not the driver will support data keyed by the [storageKey]. */
  fun willSupport(storageKey: StorageKey): Boolean

  /** Gets a [Driver] for the given [storageKey] and type [Data] (declared by [dataClass]). */
  suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>,
    type: Type
  ): Driver<Data>

  // TODO(b/169335081): once all DriverProviders implement this, we can remove these defaults.
  suspend fun removeAllEntities() = Unit

  // TODO(b/169335081): once all DriverProviders implement this, we can remove this default.
  suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) = Unit

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
