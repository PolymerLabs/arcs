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

import arcs.core.crdt.CrdtSingleton
import arcs.core.data.RawEntity
import arcs.core.storage.Callbacks
import arcs.core.storage.handle.SingletonImpl
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

open class SDKReadableSingleton<T : JvmEntity>(
    override val name: String,
    private val particle: Particle,
    private val storageHandle: SingletonImpl<RawEntity>,
    private val entitySpec: JvmEntitySpec<T>
) : ReadableSingleton<T> {

    var updateCallback: ((T?) -> Unit)? = null

    init {
        storageHandle.callback = object : Callbacks<CrdtSingleton.IOperation<RawEntity>> {
            override fun onUpdate(op: CrdtSingleton.IOperation<RawEntity>) {
                updateCallback?.invoke(fetch())
                particle.onHandleUpdate(this@SDKReadableSingleton)
            }

            override fun onSync() {
                particle.onHandleSync(this@SDKReadableSingleton, true)
            }

            override fun onDesync() { }
        }
    }

    override fun fetch(): T? = runBlocking {
        storageHandle.fetch()?.let {
            entitySpec.deserialize(it)
        }
    }

    override fun onUpdate(action: (T?) -> Unit) {
        updateCallback = action
    }
}

class SDKWritableSingleton<T : JvmEntity>(
    override val name: String,
    private val storageHandle: SingletonImpl<RawEntity>
) : WritableSingleton<T> {
    override fun set(entity: T) = runBlocking {
        storageHandle.set(entity.serialize())
    }

    override fun clear() = runBlocking(Dispatchers.Default) {
        storageHandle.clear()
    }
}

class SDKReadWriteSingleton<T : JvmEntity>(
    override val name: String,
    particle: Particle,
    private val storageHandle: SingletonImpl<RawEntity>,
    entitySpec: JvmEntitySpec<T>
) : SDKReadableSingleton<T>(name, particle, storageHandle, entitySpec),
    WritableSingleton<T> by SDKWritableSingleton(name, storageHandle),
    ReadWriteSingleton<T>
