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

import arcs.core.storage.DriverFactory
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * A [StorageServiceManager] is used by a client of the [StorageService] to manage
 * data stored within the [StorageService].
 */
class StorageServiceManager(
    /** [CoroutineContext] on which to build one specific to this [StorageServiceManager]. */
    parentCoroutineContext: CoroutineContext
) : IStorageServiceManager.Stub() {

    /** The local [CoroutineContext]. */
    private val coroutineContext = parentCoroutineContext + CoroutineName("StorageServiceManager")

    override fun clearAll(resultCallback: IResultCallback) {
        CoroutineScope(coroutineContext).launch {
            // TODO: clear data for all storage keys.
            DriverFactory.getAllStorageKeys()
        }
        resultCallback.onResult(null)
    }

    override fun clearDataBetween(
        startTimeMillis: Long,
        endTimeMillis: Long,
        resultCallback: IResultCallback
    ) {
        CoroutineScope(coroutineContext).launch {
            // TODO: clear data for all storage keys.
            DriverFactory.getAllStorageKeys()
        }
        resultCallback.onResult(null)
    }
}
