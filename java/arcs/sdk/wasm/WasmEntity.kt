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

/** Wasm-specific extensions to the base [Entity] interface. */
interface WasmEntity {
    var internalId: String
    fun encodeEntity(): NullTermByteArray
}

/** Wasm-specific extensions to the base [EntitySpec] interface. */
interface WasmEntitySpec<T : WasmEntity> {
    /** Returns an empty new instance of [T]. */
    fun create(): T

    /** Decodes the given byte array into an instance of [T]. */
    fun decode(encoded: ByteArray): T?
}
