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

/** Combined Handle to allow events on two handles to trigger actions. */
class WasmTupleHandle<T, U>(
    val handle1: WasmHandleEvents<T>,
    val handle2: WasmHandleEvents<U>
) {

    /**
     * Trigger a callback when either of the handles updates. The callback will receive the latest
     * entities from both handles.
     */
    fun onUpdate(action: (T?, U?) -> Unit) {
        listOf(handle1, handle2).forEach { handle ->
            handle.onUpdate {
                action(handle1.getContent(), handle2.getContent())
            }
        }
    }
}

/** Combined Handle to allow events on three handles to trigger actions. */
class WasmTripleHandle<T, U, V>(
    val handle1: WasmHandleEvents<T>,
    val handle2: WasmHandleEvents<U>,
    val handle3: WasmHandleEvents<V>
) {

    /**
     * Trigger a callback when any of the handles updates. The callback will receive the latest
     * entities from all handles.
     */
    fun onUpdate(action: (T?, U?, V?) -> Unit) {
        listOf(handle1, handle2, handle3).forEach { handle ->
            handle.onUpdate {
                action(handle1.getContent(), handle2.getContent(), handle3.getContent())
            }
        }
    }
}

/** Combined Handle to allow events on four handles to trigger actions. */
class WasmQuadHandle<T, U, V, W>(
    val handle1: WasmHandleEvents<T>,
    val handle2: WasmHandleEvents<U>,
    val handle3: WasmHandleEvents<V>,
    val handle4: WasmHandleEvents<W>
) {

    /**
     * Trigger a callback when any of the handles updates. The callback will receive the latest
     * entities from all handles.
     */
    fun onUpdate(action: (T?, U?, V?, W?) -> Unit) {
        listOf(handle1, handle2, handle3, handle4).forEach { handle ->
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
}

/** Combined Handle to allow events on five handles to trigger actions. */
class WasmQuinHandle<T, U, V, W, X>(
    val handle1: WasmHandleEvents<T>,
    val handle2: WasmHandleEvents<U>,
    val handle3: WasmHandleEvents<V>,
    val handle4: WasmHandleEvents<W>,
    val handle5: WasmHandleEvents<X>
) {

    /**
     * Trigger a callback when any of the handles updates. The callback will receive the latest
     * entities from all handles.
     */
    fun onUpdate(action: (T?, U?, V?, W?, X?) -> Unit) {
        listOf(handle1, handle2, handle3, handle4, handle5).forEach { handle ->
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
}

/** Combined Handle to allow events on six handles to trigger actions. */
class WasmSixHandle<T, U, V, W, X, Y>(
    val handle1: WasmHandleEvents<T>,
    val handle2: WasmHandleEvents<U>,
    val handle3: WasmHandleEvents<V>,
    val handle4: WasmHandleEvents<W>,
    val handle5: WasmHandleEvents<X>,
    val handle6: WasmHandleEvents<Y>
) {

    /**
     * Trigger a callback when any of the handles updates. The callback will receive the latest
     * entities from all handles.
     */
    fun onUpdate(action: (T?, U?, V?, W?, X?, Y?) -> Unit) {
        listOf(handle1, handle2, handle3, handle4, handle5, handle6).forEach { handle ->
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
}

/** Combined Handle to allow events on seven handles to trigger actions. */
class WasmSeptHandle<T, U, V, W, X, Y, Z>(
    val handle1: WasmHandleEvents<T>,
    val handle2: WasmHandleEvents<U>,
    val handle3: WasmHandleEvents<V>,
    val handle4: WasmHandleEvents<W>,
    val handle5: WasmHandleEvents<X>,
    val handle6: WasmHandleEvents<Y>,
    val handle7: WasmHandleEvents<Z>
) {

    /**
     * Trigger a callback when any of the handles updates. The callback will receive the latest
     * entities from all handles.
     */
    fun onUpdate(action: (T?, U?, V?, W?, X?, Y?, Z?) -> Unit) {
        listOf(handle1, handle2, handle3, handle4, handle5, handle6, handle7).forEach { handle ->
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
}

/** Combined Handle to allow events on eight handles to trigger actions. */
class WasmOctHandle<T, U, V, W, X, Y, Z, A>(
    val handle1: WasmHandleEvents<T>,
    val handle2: WasmHandleEvents<U>,
    val handle3: WasmHandleEvents<V>,
    val handle4: WasmHandleEvents<W>,
    val handle5: WasmHandleEvents<X>,
    val handle6: WasmHandleEvents<Y>,
    val handle7: WasmHandleEvents<Z>,
    val handle8: WasmHandleEvents<A>
) {

    /**
     * Trigger a callback when any of the handles updates. The callback will receive the latest
     * entities from all handles.
     */
    fun onUpdate(action: (T?, U?, V?, W?, X?, Y?, Z?, A?) -> Unit) {
        listOf(
            handle1,
            handle2,
            handle3,
            handle4,
            handle5,
            handle6,
            handle7,
            handle8
        ).forEach { handle ->
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
}

/** Combined Handle to allow events on nine handles to trigger actions. */
class WasmNovHandle<T, U, V, W, X, Y, Z, A, B>(
    val handle1: WasmHandleEvents<T>,
    val handle2: WasmHandleEvents<U>,
    val handle3: WasmHandleEvents<V>,
    val handle4: WasmHandleEvents<W>,
    val handle5: WasmHandleEvents<X>,
    val handle6: WasmHandleEvents<Y>,
    val handle7: WasmHandleEvents<Z>,
    val handle8: WasmHandleEvents<A>,
    val handle9: WasmHandleEvents<B>
) {

    /**
     * Trigger a callback when any of the handles updates. The callback will receive the latest
     * entities from all handles.
     */
    fun onUpdate(action: (T?, U?, V?, W?, X?, Y?, Z?, A?, B?) -> Unit) {
        listOf(
            handle1,
            handle2,
            handle3,
            handle4,
            handle5,
            handle6,
            handle7,
            handle8,
            handle9
        ).forEach { handle ->
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
}

/** Combined Handle to allow events on nine handles to trigger actions. */
class WasmDecHandle<T, U, V, W, X, Y, Z, A, B, C>(
    val handle1: WasmHandleEvents<T>,
    val handle2: WasmHandleEvents<U>,
    val handle3: WasmHandleEvents<V>,
    val handle4: WasmHandleEvents<W>,
    val handle5: WasmHandleEvents<X>,
    val handle6: WasmHandleEvents<Y>,
    val handle7: WasmHandleEvents<Z>,
    val handle8: WasmHandleEvents<A>,
    val handle9: WasmHandleEvents<B>,
    val handle10: WasmHandleEvents<C>
) {

    /**
     * Trigger a callback when any of the handles updates. The callback will receive the latest
     * entities from all handles.
     */
    fun onUpdate(action: (T?, U?, V?, W?, X?, Y?, Z?, A?, B?, C?) -> Unit) {
        listOf(
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
        ).forEach { handle ->
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
}
