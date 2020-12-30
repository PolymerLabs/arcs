/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.storage.service

import arcs.android.crdt.toProto
import arcs.core.crdt.CrdtException
import arcs.core.host.ArcHostManager
import arcs.core.storage.DriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.database.HardReferenceManager
import arcs.core.storage.driver.DatabaseDriverProvider
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch

/**
 * A [StorageServiceManager] is used by a client of the [StorageService] to manage
 * data stored within the [StorageService].
 */
@OptIn(ExperimentalCoroutinesApi::class)
class StorageServiceManager(
  /** [CoroutineScope] on which this [StorageServiceManager] runs. */
  private val scope: CoroutineScope,

  /** The [DriverFactory] that's managing active drivers for the service. */
  private val driverFactory: DriverFactory,

  /** The stores managed by StorageService. */
  val stores: ConcurrentHashMap<StorageKey, DeferredStore<*, *, *>>
) : IStorageServiceManager.Stub() {

  // TODO(b/174432505): Don't use the GLOBAL_INSTANCE, accept as a constructor param instead.
  private val storageKeyManager = StorageKeyManager.GLOBAL_INSTANCE

  override fun clearAll(resultCallback: IResultCallback) {
    scope.launch {
      ArcHostManager.pauseAllHostsFor {
        driverFactory.removeAllEntities()
        // Clear stores map, to remove cached data (as a precaution only, as changes should
        // propagate to stores).
        stores.clear()
      }
      resultCallback.onResult(null)
    }
  }

  override fun clearDataBetween(
    startTimeMillis: Long,
    endTimeMillis: Long,
    resultCallback: IResultCallback
  ) {
    scope.launch {
      ArcHostManager.pauseAllHostsFor {
        driverFactory.removeEntitiesCreatedBetween(startTimeMillis, endTimeMillis)
        // Clear stores map, to remove cached data (as a precaution only, as changes should
        // propagate to stores).
        stores.clear()
      }
      resultCallback.onResult(null)
    }
  }

  override fun resetDatabases(resultCallback: IResultCallback) {
    scope.launch {
      DatabaseDriverProvider.manager.resetAll()
      // Clear stores map, to remove cached data, as resetting the database does not propagate
      // changes to the stores.
      stores.clear()
      resultCallback.onResult(null)
    }
  }

  override fun triggerHardReferenceDeletion(
    storageKey: String,
    entityId: String,
    resultCallback: IHardReferencesRemovalCallback
  ) {
    val referenceManager = HardReferenceManager(DatabaseDriverProvider.manager)
    launchHandlingExceptions(resultCallback, "triggerHardReferenceDeletion") {
      referenceManager.triggerDatabaseDeletion(storageKeyManager.parse(storageKey), entityId)
    }
  }

  override fun reconcileHardReferences(
    storageKey: String,
    idsToRetain: List<String>,
    resultCallback: IHardReferencesRemovalCallback
  ) {
    val referenceManager = HardReferenceManager(DatabaseDriverProvider.manager)
    launchHandlingExceptions(resultCallback, "reconcileHardReferences") {
      referenceManager.reconcile(storageKeyManager.parse(storageKey), idsToRetain.toSet())
    }
  }

  private fun launchHandlingExceptions(
    resultCallback: IHardReferencesRemovalCallback,
    message: String,
    action: suspend () -> Long
  ) = scope.launch {
    try {
      resultCallback.onSuccess(action())
    } catch (e: Exception) {
      resultCallback.onFailure(CrdtException("$message failed", e).toProto().toByteArray())
    }
  }
}
