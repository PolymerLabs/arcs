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

open class WasmSingleton<T : WasmEntity>(
    particle: WasmParticle,
    name: String,
    private val entitySpec: WasmEntitySpec<T>
) : WasmHandle<T>(name, particle), ReadWriteSingleton<T> {

    private var entity: T? = null

    override fun sync(encoded: ByteArray) {
        entity = entitySpec.decode(encoded)
    }

    override fun update(added: ByteArray, removed: ByteArray) = sync(added)

    override fun get() = entity

    override fun set(entity: T) {
        this.entity = entity
        val encoded = entity.encodeEntity()
        WasmRuntimeClient.singletonSet(particle, this, encoded)
        if (!entity.isSet()) {
            log("WARNING: ${
            entity.getFieldsNotSet().joinToString(", ")
            } fields on $entity are not set")
        }
    }

    override fun clear() {
        entity = entitySpec.create()
        WasmRuntimeClient.singletonClear(particle, this)
    }
}
