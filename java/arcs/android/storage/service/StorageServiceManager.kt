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
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * A [StorageServiceManager] is used by a client of the [StorageService] to manage
 * data stored within the [StorageService].
 */
@ExperimentalCoroutinesApi
class StorageServiceManager(
    /** [CoroutineContext] on which to build one specific to this [StorageServiceManager]. */
    parentCoroutineContext: CoroutineContext,
    /** The stores managed by StorageService. */
    val stores: ConcurrentHashMap<StorageKey, DeferredStore<*, *, *>>
) : IStorageServiceManager.Stub() {

    /** The local [CoroutineContext]. */
    private val coroutineContext = parentCoroutineContext + CoroutineName("StorageServiceManager")
    private val scope = CoroutineScope(coroutineContext)

    override fun clearAll(resultCallback: IResultCallback) {
        scope.launch {
            ArcHostManager.pauseAllHostsFor {
                DriverFactory.removeAllEntities().join()
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
                DriverFactory.removeEntitiesCreatedBetween(startTimeMillis, endTimeMillis).join()
            }
            resultCallback.onResult(null)
        }
    }

    override fun resetDatabases(resultCallback: IResultCallback) {
        scope.launch {
            DatabaseDriverProvider.manager.resetAll()
            resultCallback.onResult(null)
        }
    }
}
