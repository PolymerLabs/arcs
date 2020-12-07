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

import arcs.core.host.ArcHostManager
import arcs.core.storage.DriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.DatabaseDriverProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap

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
}
