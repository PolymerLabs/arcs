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
class WasmSingletonImpl<T : WasmEntity>(
    particle: WasmParticleImpl,
    name: String,
    private val entitySpec: WasmEntitySpec<T>
) : WasmHandleEvents<T>(particle, name) {

    private var entity: T? = null

    override fun sync(encoded: ByteArray) {
        entity = if (encoded.size > 0) entitySpec.decode(encoded) else null
    }

    override fun update(added: ByteArray, removed: ByteArray) {
        sync(added)
        onUpdateActions.forEach { action ->
            action(entity)
        }
    }

    fun fetch() = entity

    fun store(entity: T) {
        this.entity = entity
        val encoded = entity.encodeEntity()
        WasmRuntimeClient.singletonSet(particle, this, encoded)
    }

    fun clear() {
        entity = null
        WasmRuntimeClient.singletonClear(particle, this)
        onUpdateActions.forEach { action ->
            action(entity)
        }
    }
}
