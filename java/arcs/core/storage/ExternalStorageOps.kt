package arcs.core.storage

/**
 * These are operations that can be performed on the StorageService anywhere. They currently must be
 * called in the same process as StorageService, but can be refactored to be backed by IPC.
 */
interface ExternalStorageOps {
  /**
   * Gets total entities stored in all providers.
   *
   * @param inMemory if true, return count of entities stored in-memory, otherwise return count
   *   of entities stored on-disk.
   */
  suspend fun getEntitiesCount(inMemory: Boolean): Long

  /**
   * Gets total storage size (bytes) used by all providers.
   *
   * @param inMemory if true, return size stored in-memory, otherwise return size stored on-disk.
   */
  suspend fun getStorageSize(inMemory: Boolean): Long
}
