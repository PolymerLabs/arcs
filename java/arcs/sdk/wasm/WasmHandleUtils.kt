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

package arcs.sdk.wasm

/**
 * Receive a callback when either handle is updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @action callback
 */
fun <T, U> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    action: (T, U) -> Unit
) {
    val handles = listOf(handle1, handle2)
    handles.forEach { handle ->
        handle.onUpdate {
            handle1.getContent()
            handle2.getContent()
            log("yo yo yo")
            action(handle1.getContent(), handle2.getContent())
        }
    }
}


private fun<T> WasmHandleEvents<T>.getContent(): T {
    val c = this::class.simpleName!!
    log(c)
    if (c == "WasmCollectionImpl") {
        val h = this as WasmCollectionImpl<*>
        return h.fetchAll() as T
    }
    else {
        val h = this as WasmSingletonImpl<*>
        return h.fetch() as T
    }
}

//    when(this) {
//
//    is WasmCollectionImpl<*, T> -> this.fetchAll()
//    is WasmSingletonImpl<*> -> this.fetch()
//    else -> throw IllegalArgumentException(
//        "Could not convert $this to Boolean, expected 0 or 1."
//    )
//}
