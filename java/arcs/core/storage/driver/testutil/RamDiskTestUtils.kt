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

@file:Suppress("EXPERIMENTAL_API_USAGE")

package arcs.core.storage.driver.testutil

import arcs.core.crdt.CrdtData
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.RamDisk
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.suspendCancellableCoroutine

/** Suspends until the [RamDisk] contains a value for the provided [storageKey]. */
suspend fun RamDisk.waitUntilSet(storageKey: StorageKey) = suspendCancellableCoroutine<Unit> {
    var listener: ((StorageKey, Any?) -> Unit)? = null
    listener = listener@{ changedKey, data ->
        if (changedKey != storageKey || data == null) {
            return@listener
        }
        removeListener(listener!!)
        it.resume(Unit) { e -> throw e }
    }
    addListener(listener)

    val startValue = memory.get<CrdtData>(storageKey)
    it.invokeOnCancellation { removeListener(listener) }
    if (startValue?.data != null) {
        it.resume(Unit) { e -> throw e }
        removeListener(listener)
    }
}

/** Asynchronously waits for the [RamDisk] value at [storageKey] to be changed. */
fun RamDisk.asyncWaitForUpdate(storageKey: StorageKey): Deferred<CrdtData> {
    val result = CompletableDeferred<CrdtData>()
    var listener: ((StorageKey, Any?) -> Unit)? = null
    listener = listener@{ changedKey, data ->
        if (changedKey != storageKey || data == null) {
            return@listener
        }
        removeListener(listener!!)
        result.complete(data as CrdtData)
    }
    addListener(listener)
    return result
}
