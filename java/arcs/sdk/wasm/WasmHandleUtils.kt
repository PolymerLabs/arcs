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
            action(handle1.getContent(), handle2.getContent())
        }
    }
}

/**
 * Receive a callback when one of three handles are updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @handle3 The third handle the callback will be assigned to
 * @action callback
 */
fun <T, U, V> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    handle3: WasmHandleEvents<V>,
    action: (T, U, V) -> Unit
) {
    val handles = listOf(handle1, handle2, handle3)
    handles.forEach { handle ->
        handle.onUpdate {
            action(handle1.getContent(), handle2.getContent(), handle3.getContent())
        }
    }
}

/**
 * Receive a callback when one of four handles are updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @handle3 The third handle the callback will be assigned to
 * @handle4 The fourth handle the callback will be assigned to
 * @action callback
 */
fun <T, U, V, W> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    handle3: WasmHandleEvents<V>,
    handle4: WasmHandleEvents<W>,
    action: (T, U, V, W) -> Unit
) {
    val handles = listOf(handle1, handle2, handle3, handle4)
    handles.forEach { handle ->
        handle.onUpdate {
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent()
            )
        }
    }
}

/**
 * Receive a callback when one of four handles are updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @handle3 The third handle the callback will be assigned to
 * @handle4 The fourth handle the callback will be assigned to
 * @handle5 The fifth handle the callback will be assigned to
 * @action callback
 */
fun <T, U, V, W, X> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    handle3: WasmHandleEvents<V>,
    handle4: WasmHandleEvents<W>,
    handle5: WasmHandleEvents<X>,
    action: (T, U, V, W, X) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5
    )
    handles.forEach { handle ->
        handle.onUpdate {
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent()
            )
        }
    }
}

/**
 * Receive a callback when one of four handles are updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @handle3 The third handle the callback will be assigned to
 * @handle4 The fourth handle the callback will be assigned to
 * @handle5 The fifth handle the callback will be assigned to
 * @handle6 The sixth handle the callback will be assigned to
 * @action callback
 */
fun <T, U, V, W, X, Y> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    handle3: WasmHandleEvents<V>,
    handle4: WasmHandleEvents<W>,
    handle5: WasmHandleEvents<X>,
    handle6: WasmHandleEvents<Y>,
    action: (T, U, V, W, X, Y) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5,
        handle6
    )
    handles.forEach { handle ->
        handle.onUpdate {
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent()
            )
        }
    }
}

/**
 * Receive a callback when one of four handles are updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @handle3 The third handle the callback will be assigned to
 * @handle4 The fourth handle the callback will be assigned to
 * @handle5 The fifth handle the callback will be assigned to
 * @handle6 The sixth handle the callback will be assigned to
 * @handle7 The seventh handle the callback will be assigned to
 * @action callback
 */
fun <T, U, V, W, X, Y, Z> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    handle3: WasmHandleEvents<V>,
    handle4: WasmHandleEvents<W>,
    handle5: WasmHandleEvents<X>,
    handle6: WasmHandleEvents<Y>,
    handle7: WasmHandleEvents<Z>,
    action: (T, U, V, W, X, Y, Z) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5,
        handle6,
        handle7
    )
    handles.forEach { handle ->
        handle.onUpdate {
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent()
            )
        }
    }
}

/**
 * Receive a callback when one of four handles are updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @handle3 The third handle the callback will be assigned to
 * @handle4 The fourth handle the callback will be assigned to
 * @handle5 The fifth handle the callback will be assigned to
 * @handle6 The sixth handle the callback will be assigned to
 * @handle7 The seventh handle the callback will be assigned to
 * @handle8 The eigth handle the callback will be assigned to
 * @action callback
 */
fun <T, U, V, W, X, Y, Z, A> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    handle3: WasmHandleEvents<V>,
    handle4: WasmHandleEvents<W>,
    handle5: WasmHandleEvents<X>,
    handle6: WasmHandleEvents<Y>,
    handle7: WasmHandleEvents<Z>,
    handle8: WasmHandleEvents<A>,
    action: (T, U, V, W, X, Y, Z, A) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5,
        handle6,
        handle7,
        handle8
    )
    handles.forEach { handle ->
        handle.onUpdate {
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent()
            )
        }
    }
}

/**
 * Receive a callback when one of four handles are updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @handle3 The third handle the callback will be assigned to
 * @handle4 The fourth handle the callback will be assigned to
 * @handle5 The fifth handle the callback will be assigned to
 * @handle6 The sixth handle the callback will be assigned to
 * @handle7 The seventh handle the callback will be assigned to
 * @handle8 The eigth handle the callback will be assigned to
 * @handle9 The ninth handle the callback will be assigned to
 * @action callback
 */
fun <T, U, V, W, X, Y, Z, A, B> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    handle3: WasmHandleEvents<V>,
    handle4: WasmHandleEvents<W>,
    handle5: WasmHandleEvents<X>,
    handle6: WasmHandleEvents<Y>,
    handle7: WasmHandleEvents<Z>,
    handle8: WasmHandleEvents<A>,
    handle9: WasmHandleEvents<B>,
    action: (T, U, V, W, X, Y, Z, A, B) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5,
        handle6,
        handle7,
        handle8,
        handle9
    )
    handles.forEach { handle ->
        handle.onUpdate {
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent(),
                handle9.getContent()
            )
        }
    }
}

/**
 * Receive a callback when one of four handles are updated.
 *
 * @handle1 The first handle the callback will be assigned to
 * @handle2 The second handle the callback will be assigned to
 * @handle3 The third handle the callback will be assigned to
 * @handle4 The fourth handle the callback will be assigned to
 * @handle5 The fifth handle the callback will be assigned to
 * @handle6 The sixth handle the callback will be assigned to
 * @handle7 The seventh handle the callback will be assigned to
 * @handle8 The eigth handle the callback will be assigned to
 * @handle9 The ninth handle the callback will be assigned to
 * @handle10 The tenth handle the callback will be assigned to
 * @action callback
 */
fun <T, U, V, W, X, Y, Z, A, B, C> combineUpdates(
    handle1: WasmHandleEvents<T>,
    handle2: WasmHandleEvents<U>,
    handle3: WasmHandleEvents<V>,
    handle4: WasmHandleEvents<W>,
    handle5: WasmHandleEvents<X>,
    handle6: WasmHandleEvents<Y>,
    handle7: WasmHandleEvents<Z>,
    handle8: WasmHandleEvents<A>,
    handle9: WasmHandleEvents<B>,
    handle10: WasmHandleEvents<C>,
    action: (T, U, V, W, X, Y, Z, A, B, C) -> Unit
) {
    val handles = listOf(
        handle1,
        handle2,
        handle3,
        handle4,
        handle5,
        handle6,
        handle7,
        handle8,
        handle9,
        handle10
    )
    handles.forEach { handle ->
        handle.onUpdate {
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent(),
                handle9.getContent(),
                handle10.getContent()
            )
        }
    }
}

@Suppress("UNCHECKED_CAST")
private fun <T> WasmHandleEvents<T>.getContent(): T = when (this) {
    is WasmCollectionImpl<*> -> this.fetchAll()
    is WasmSingletonImpl<*> -> this.fetch() as T
    else -> throw IllegalArgumentException("Unknown WasmHandleEvents type found")
}
