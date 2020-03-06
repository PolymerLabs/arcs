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

/** Combined Handle to allow events on multiple handles to trigger actions. */
class WasmTupleHandle<T, U>(
    val handle1: WasmHandleEvents<T>,
    val handle2: WasmHandleEvents<U>
) {

    fun onUpdate(action: (T?, U?) -> Unit) {
        this.handle1.onUpdate { e ->
            action(e, handle2.getContent())
        }

        this.handle2.onUpdate { e ->
            action(handle1.getContent(), e)
        }
    }
}
