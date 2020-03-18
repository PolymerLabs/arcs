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
package arcs.sdk

import arcs.core.storage.api.ReadCollectionHandle
import arcs.core.storage.api.ReadSingletonHandle
import arcs.core.storage.api.ReadWriteCollectionHandle
import arcs.core.storage.api.ReadWriteSingletonHandle
import arcs.core.storage.api.ReadableHandle

/**
 * Receive a callback when either handle is updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @action callback
 */
suspend fun <T, U> combineUpdates(
    handle1: ReadableHandle<T>,
    handle2: ReadableHandle<U>,
    action: (T, U) -> Unit
) {
    val handles = listOf(handle1, handle2)
    handles.forEach { handle ->
        handle.onUpdate {
            val e1 = handle1.getContent().invoke()
            val e2 = handle2.getContent().invoke()
            action(e1, e2)
        }
    }
}

private suspend fun <T> ReadableHandle<T>.getContent(): suspend () -> T = when (this) {
    is ReadWriteSingletonHandle<*> -> suspend { this.fetch() as T }
    is ReadSingletonHandle<*> -> suspend { this.fetch() as T }
    is ReadWriteCollectionHandle<*> -> suspend { this.fetchAll() as T }
    is ReadCollectionHandle<*> -> suspend { this.fetchAll() as T }
    else -> throw IllegalArgumentException("Unknown WasmHandleEvents type found")
}
