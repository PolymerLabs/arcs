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
