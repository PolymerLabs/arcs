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

/** Base [Handle] implementation for WASM. */
abstract class WasmHandle(
    val name: String,
    val particle: WasmParticleImpl
) {

    init {
        particle.registerHandle(this)
    }

    abstract fun sync(encoded: ByteArray)
    abstract fun update(added: ByteArray, removed: ByteArray)
}

abstract class WasmHandleEvents<T>(
    particle: WasmParticleImpl,
    name: String
) : WasmHandle(name, particle) {
    protected val onUpdateActions: MutableList<(T) -> Unit> = mutableListOf()

    fun onUpdate(action: (T) -> Unit) {
        onUpdateActions.add(action)
    }
}

abstract class WasmHandleEvents<T>(
    particle: WasmParticleImpl,
    name: String
) : WasmHandle(name, particle) {
    protected val onUpdateActions: MutableList<(T) -> Unit> = mutableListOf()

    fun onUpdate(action: (T) -> Unit) {
        onUpdateActions.add(action)
    }
}
