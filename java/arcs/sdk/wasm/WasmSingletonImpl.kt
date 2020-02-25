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
) : WasmHandle(name, particle) {

    private var entity: T? = null
    private val onUpdateActions: MutableList<(T?) -> Unit> = mutableListOf()

    override fun sync(encoded: ByteArray) {
        entity = if (encoded.size > 0) entitySpec.decode(encoded) else null
    }

    override fun update(added: ByteArray, removed: ByteArray) {
        sync(added)
        onUpdateActions.forEach { action ->
            action(entity)
        }
    }

    fun onUpdate(action: (T?) -> Unit) {
        onUpdateActions.add(action)
    }

    fun fetch() = entity

    /** TODO(heimlich): remove this once all particles are changed. */
    fun set(entity: T) = store(entity)

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
