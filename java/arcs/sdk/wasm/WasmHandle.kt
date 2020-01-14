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

import arcs.sdk.Handle

/** Base [Handle] implementation for WASM. */
abstract class WasmHandle<T : WasmEntity>(
    override val name: String,
    val particle: WasmParticle
) : Handle {
    init {
        particle.registerHandle(this)
    }

    abstract fun sync(encoded: ByteArray)
    abstract fun update(added: ByteArray, removed: ByteArray)
}
