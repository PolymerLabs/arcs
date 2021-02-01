package arcs.sdk.android.storage.service

import arcs.android.storage.service.StorageServiceManager
import arcs.core.data.Schema

/**
 * A [StorageServiceManagerEndpoint] can be used to bind to an Android [StorageServiceManager] and
 * call its callback-style methods.
 */
interface StorageServiceManagerEndpoint {

  /**
   * Triggers a hard reference deletions for foreign hard references with the given Schema [namespace]
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
