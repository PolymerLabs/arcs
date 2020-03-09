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

import kotlin.coroutines.CoroutineContext

/**
 * A [StorageServiceManager] is used by a client of the [StorageService] to manage
 * data stored within the [StorageService].
 */
class StorageServiceManager(
    /** [CoroutineContext] on which to build one specific to this [BindingContext]. */
    parentCoroutineContext: CoroutineContext,
    /** Sink to use for recording statistics about accessing data. */
    private val bindingContextStatisticsSink: BindingContextStatisticsSink
) : IStorageServiceManager.Stub() {

    override fun clearAll(resultCallback: IResultCallback) {
        // TODO: implement.
        resultCallback.onResult(null)
    }

    override fun clearDataBetween(
        clearingArea: Int,
        startTimeMillis: Long,
        endTimeMillis: Long,
        resultCallback: IResultCallback
    ) {
        // TODO: implement.
        resultCallback.onResult(null)
    }
}
