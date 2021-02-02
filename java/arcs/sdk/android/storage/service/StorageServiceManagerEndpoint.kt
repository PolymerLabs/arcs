package arcs.sdk.android.storage.service

import arcs.android.storage.service.StorageServiceManager
import arcs.core.data.Schema

/**
 * A [StorageServiceManagerEndpoint] can be used run some of the [StorageServiceManager] methods.
 * In an android settings it will bing to the storage service to get hold of the
 * StorageServiceManager.
 */
interface StorageServiceManagerEndpoint {

  /**
   * Triggers hard reference deletions for foreign hard references with the given Schema [namespace]
   * and [id].
   *
   * @return the number of entities removed.
   */
  suspend fun triggerForeignHardReferenceDeletion(namespace: Schema, id: String): Long

  /**
   * Triggers a hard reference reconciliation for foreign hard references with the given Schema
   * [namespace] and [id].
   *
   * @return the number of entities removed.
   */
  suspend fun reconcileForeignHardReference(namespace: Schema, idsToRetain: Set<String>): Long

  /**
   * Binds to the IStorageServiceManager and starts a garbage collection run.
   */
  suspend fun runGarbageCollection()
}
