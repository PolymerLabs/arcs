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
     * */
    fun onUpdate(action: (T?, U?) -> Unit) {
        handle1.onUpdate { e ->
            action(e, handle2.getContent())
        }

        handle2.onUpdate { e ->
            action(handle1.getContent(), e)
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
     * */
    fun onUpdate(action: (T?, U?, V?) -> Unit) {
        handle1.onUpdate { e ->
            action(e, handle2.getContent(), handle3.getContent())
        }

        handle2.onUpdate { e ->
            action(handle1.getContent(), e, handle3.getContent())
        }

        handle3.onUpdate { e ->
            action(handle1.getContent(), handle2.getContent(), e)
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
     * */
    fun onUpdate(action: (T?, U?, V?, W?) -> Unit) {
        handle1.onUpdate { e ->
            action(e, handle2.getContent(), handle3.getContent(), handle4.getContent())
        }

        handle2.onUpdate { e ->
            action(handle1.getContent(), e, handle3.getContent(), handle4.getContent())
        }

        handle3.onUpdate { e ->
            action(handle1.getContent(), handle2.getContent(), e, handle4.getContent())
        }

        handle4.onUpdate { e ->
            action(handle1.getContent(), handle2.getContent(), handle3.getContent(), e)
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
     * */
    fun onUpdate(action: (T?, U?, V?, W?, X?) -> Unit) {
        handle1.onUpdate { e ->
            action(
                e,
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent()
            )
        }

        handle2.onUpdate { e ->
            action(
                handle1.getContent(),
                e,
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent()
            )
        }

        handle3.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                e,
                handle4.getContent(),
                handle5.getContent()
            )
        }

        handle4.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                e,
                handle5.getContent()
            )
        }

        handle5.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                e
            )
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
     * */
    fun onUpdate(action: (T?, U?, V?, W?, X?, Y?) -> Unit) {
        handle1.onUpdate { e ->
            action(
                e,
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent()
            )
        }

        handle2.onUpdate { e ->
            action(
                handle1.getContent(),
                e,
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent()
            )
        }

        handle3.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                e,
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent()
            )
        }

        handle4.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                e,
                handle5.getContent(),
                handle6.getContent()
            )
        }

        handle5.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                e,
                handle6.getContent()
            )
        }

        handle6.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                e
            )
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
     * */
    fun onUpdate(action: (T?, U?, V?, W?, X?, Y?, Z?) -> Unit) {
        handle1.onUpdate { e ->
            action(
                e,
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent()
            )
        }

        handle2.onUpdate { e ->
            action(
                handle1.getContent(),
                e,
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent()
            )
        }

        handle3.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                e,
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent()
            )
        }

        handle4.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                e,
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent()
            )
        }

        handle5.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                e,
                handle6.getContent(),
                handle7.getContent()
            )
        }

        handle6.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                e,
                handle7.getContent()
            )
        }

        handle7.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                e
            )
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
     * */
    fun onUpdate(action: (T?, U?, V?, W?, X?, Y?, Z?, A?) -> Unit) {
        handle1.onUpdate { e ->
            action(
                e,
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent()
            )
        }

        handle2.onUpdate { e ->
            action(
                handle1.getContent(),
                e,
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent()
            )
        }

        handle3.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                e,
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent()
            )
        }

        handle4.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                e,
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent()
            )
        }

        handle5.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                e,
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent()
            )
        }

        handle6.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                e,
                handle7.getContent(),
                handle8.getContent()
            )
        }

        handle7.onUpdate { e ->
          action(
              handle1.getContent(),
              handle2.getContent(),
              handle3.getContent(),
              handle4.getContent(),
              handle5.getContent(),
              handle6.getContent(),
              e,
              handle8.getContent()
          )
        }

        handle8.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                e
            )
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
     * */
    fun onUpdate(action: (T?, U?, V?, W?, X?, Y?, Z?, A?, B?) -> Unit) {
        handle1.onUpdate { e ->
            action(
                e,
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

        handle2.onUpdate { e ->
            action(
                handle1.getContent(),
                e,
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent(),
                handle9.getContent()
            )
        }

        handle3.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                e,
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent(),
                handle9.getContent()
            )
        }

        handle4.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                e,
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent(),
                handle9.getContent()
            )
        }

        handle5.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                e,
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent(),
                handle9.getContent()
            )
        }

        handle6.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                e,
                handle7.getContent(),
                handle8.getContent(),
                handle9.getContent()
            )
        }

        handle7.onUpdate { e ->
          action(
              handle1.getContent(),
              handle2.getContent(),
              handle3.getContent(),
              handle4.getContent(),
              handle5.getContent(),
              handle6.getContent(),
              e,
              handle8.getContent(),
              handle9.getContent()
          )
        }

        handle8.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                e,
                handle9.getContent()
            )
        }

        handle9.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent(),
                e
            )
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
     * */
    fun onUpdate(action: (T?, U?, V?, W?, X?, Y?, Z?, A?, B?, C?) -> Unit) {
        handle1.onUpdate { e ->
            action(
                e,
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

        handle2.onUpdate { e ->
            action(
                handle1.getContent(),
                e,
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

        handle3.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                e,
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent(),
                handle9.getContent(),
                handle10.getContent()
            )
        }

        handle4.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                e,
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent(),
                handle9.getContent(),
                handle10.getContent()
            )
        }

        handle5.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                e,
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent(),
                handle9.getContent(),
                handle10.getContent()
            )
        }

        handle6.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                e,
                handle7.getContent(),
                handle8.getContent(),
                handle9.getContent(),
                handle10.getContent()
            )
        }

        handle7.onUpdate { e ->
          action(
              handle1.getContent(),
              handle2.getContent(),
              handle3.getContent(),
              handle4.getContent(),
              handle5.getContent(),
              handle6.getContent(),
              e,
              handle8.getContent(),
              handle9.getContent(),
              handle10.getContent()
          )
        }

        handle8.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                e,
                handle9.getContent(),
                handle10.getContent()
            )
        }

        handle9.onUpdate { e ->
            action(
                handle1.getContent(),
                handle2.getContent(),
                handle3.getContent(),
                handle4.getContent(),
                handle5.getContent(),
                handle6.getContent(),
                handle7.getContent(),
                handle8.getContent(),
                e,
                handle10.getContent()
            )
        }

        handle10.onUpdate { e ->
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
                e
            )
        }
    }
}

