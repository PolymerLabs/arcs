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

import arcs.sdk.Entity
import arcs.sdk.EntitySpec
import arcs.sdk.NullTermByteArray

/** Wasm-specific extensions to the base [Entity] class. */
abstract class WasmEntity : Entity() {
    abstract fun encodeEntity(): NullTermByteArray
}

interface WasmEntitySpec<T : Entity> : EntitySpec<T> {
    /** Decodes the given byte array into an instance of [T]. */
    fun decode(encoded: ByteArray): T?
}
