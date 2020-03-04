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

/** [ReadWriteSingleton] implementation for WASM. */
class WasmCombinedSingletonHandle<T : WasmEntity>(val handles: List<WasmSingletonImpl<T>>) {

    fun onUpdate(action: (T?) -> Unit) {
        this.handles.forEach { handle ->
            handle.onUpdate(action)
        }
    }
}
