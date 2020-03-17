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
package arcs.core.host

import arcs.sdk.arcx

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
        val e1 = handle1.getContent().invoke()
        val e2 = handle2.getContent().invoke()
        handle.onUpdate {
            action(e1, e2)
        }
    }
}

//private fun <T> ReadableHandle<T>.getContent(): suspend () -> T {
//    if (this is ReadWriteSingletonHandle<*>) {
//        return suspend { this.fetch() as T }
//    }
//
//    else {
//        throw IllegalArgumentException("Unknown WasmHandleEvents type found")
//    }
//}

private fun <T> ReadableHandle<T>.getContent(): suspend () -> T = when (this) {
    is ReadWriteSingletonHandle<*> -> suspend { this.fetch() as T }
    is ReadSingletonHandle<*> -> suspend { this.fetch() as T }
    is ReadWriteCollectionHandle<*> -> suspend { this.fetchAll() as T }
    is ReadCollectionHandle<*> -> suspend { this.fetchAll() as T }
    else -> throw IllegalArgumentException("Unknown WasmHandleEvents type found")
}



