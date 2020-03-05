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

/** [ReadWriteCollection] implementation for WASM. */
class WasmCollectionImpl<T : WasmEntity>(
    particle: WasmParticleImpl,
    name: String,
    private val entitySpec: WasmEntitySpec<T>
) : WasmHandleEvents<Set<T>>(particle, name) {

    private val entities: MutableMap<String, T> = mutableMapOf()

    val size: Int
        get() = entities.size

    fun fetchAll() = entities.values.toSet()

    override fun sync(encoded: ByteArray) {
        entities.clear()
        add(encoded)
    }

    override fun update(added: ByteArray, removed: ByteArray) {
        add(added)
        with(StringDecoder(removed)) {
            var num = getInt(':')
            while (num-- > 0) {
                val len = getInt(':')
                val chunk = chomp(len)
                // TODO: just get the id, no need to decode the full entity
                val entity = requireNotNull(entitySpec.decode(chunk))
                entities.remove(entity.internalId)
            }
        }
        notifyOnUpdateActions()
    }

    fun isEmpty() = entities.isEmpty()

    fun store(entity: T) {
        val encoded = entity.encodeEntity()
        WasmRuntimeClient.collectionStore(particle, this, encoded)?.let { entity.internalId = it }
        entities[entity.internalId] = entity
    }

    fun remove(entity: T) {
        entities[entity.internalId]?.let {
            val encoded = it.encodeEntity()
            entities.remove(entity.internalId)
            WasmRuntimeClient.collectionRemove(particle, this, encoded)
        }
        notifyOnUpdateActions()
    }

    private fun add(added: ByteArray) {
        with(StringDecoder(added)) {
            repeat(getInt(':')) {
                val len = getInt(':')
                val chunk = chomp(len)
                val entity = requireNotNull(entitySpec.decode(chunk))
                entities[entity.internalId] = entity
            }
        }
    }

    fun clear() {
        entities.clear()
        WasmRuntimeClient.collectionClear(particle, this)
        notifyOnUpdateActions()
    }

    fun notifyOnUpdateActions() {
        val s = entities.values.toSet()
        onUpdateActions.forEach { action ->
            action(s)
        }
    }

    override fun getEntity(): Set<T> = fetchAll()
}
