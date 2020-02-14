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

package arcs.sdk

import arcs.core.crdt.CrdtSet
import arcs.core.data.RawEntity
import arcs.core.storage.Callbacks
import arcs.core.storage.handle.CollectionImpl
import kotlinx.coroutines.runBlocking

open class SDKReadableCollection<T : JvmEntity>(
    override val name: String,
    private val particle: Particle,
    private val storageHandle: CollectionImpl<RawEntity>,
    private val entitySpec: JvmEntitySpec<T>
) : ReadableCollection<T> {

    var updateCallback: ((Set<T>) -> Unit)? = null

    init {
        storageHandle.callback = object : Callbacks<CrdtSet.IOperation<RawEntity>> {
            override fun onUpdate(op: CrdtSet.IOperation<RawEntity>) {
                updateCallback?.invoke(fetchAll())
                particle.onHandleUpdate(this@SDKReadableCollection)
            }

            override fun onSync() {
                particle.onHandleSync(this@SDKReadableCollection, true)
            }

            override fun onDesync() { }
        }
    }
    override val size: Int
        get() = fetchAll().size

    override fun isEmpty() = fetchAll().isEmpty()

    override fun onUpdate(action: (Set<T>) -> Unit) {
        updateCallback = action
    }

    override fun fetchAll() = runBlocking {
        storageHandle.fetchAll().map { entitySpec.deserialize(it) }.toSet()
    }
}

class SDKWritableCollection<T : JvmEntity>(
    override val name: String,
    private val storageHandle: CollectionImpl<RawEntity>
) : WritableCollection<T> {
    override fun store(entity: T) = runBlocking {
        storageHandle.store(entity.serialize())
    }

    override fun clear() = runBlocking {
        storageHandle.clear()
    }

    override fun remove(entity: T) = runBlocking {
        storageHandle.remove(entity.serialize())
    }
}

class SDKReadWriteCollection<T : JvmEntity>(
    override val name: String,
    particle: Particle,
    private val storageHandle: CollectionImpl<RawEntity>,
    entitySpec: JvmEntitySpec<T>
) : SDKReadableCollection<T>(name, particle, storageHandle, entitySpec),
    WritableCollection<T> by SDKWritableCollection(name, storageHandle),
    ReadWriteCollection<T>
