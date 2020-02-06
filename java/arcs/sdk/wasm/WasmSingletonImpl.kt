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

import arcs.sdk.ReadWriteSingleton

/** [ReadWriteSingleton] implementation for WASM. */
class WasmSingletonImpl<T : WasmEntity>(
    particle: WasmParticleImpl,
    name: String,
    private val entitySpec: WasmEntitySpec<T>
) : WasmHandle<T>(name, particle), ReadWriteSingleton<T> {

    private var entity: T? = null
    private var onUpdateAction: (T?) -> Unit = {}

    override fun sync(encoded: ByteArray) {
        entity = if (encoded.size > 0) entitySpec.decode(encoded) else null
    }

    override fun update(added: ByteArray, removed: ByteArray) {
        sync(added)
        onUpdateAction(entity)
    }

    override fun onUpdate(action: (T?) -> Unit) {
        onUpdateAction = action
    }

    override fun fetch() = entity

    override fun set(entity: T) {
        this.entity = entity
        val encoded = entity.encodeEntity()
        WasmRuntimeClient.singletonSet(particle, this, encoded)
    }

    override fun clear() {
        entity = null
        WasmRuntimeClient.singletonClear(particle, this)
        onUpdateAction(entity)
    }
}
