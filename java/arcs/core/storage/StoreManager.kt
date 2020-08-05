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
package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.util.guardedBy
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Store manager provides a central holding places for the [Store] instances that a runtime will
 * use, so that only one instance of a [Store] can be created per [StorageKey].
 */
class StoreManager(
    /**
     * If a store doesn't yet exist in this [StoreManager] for a provided [StorageKey],
     * it will be created using this [ActivationFactory]
     */
    activationFactory: ActivationFactory? = null
) {
    val activationFactory = activationFactory ?: DefaultActivationFactory

    private val storesMutex = Mutex()
    private val stores by guardedBy(storesMutex, mutableMapOf<StorageKey, ActiveStore<*, *, *>>())

    @Suppress("UNCHECKED_CAST")
    suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
        storeOptions: StoreOptions
    ) = storesMutex.withLock {
        stores.getOrPut(storeOptions.storageKey) {
            activationFactory<Data, Op, T>(storeOptions)
        } as ActiveStore<Data, Op, T>
    }

    suspend fun waitForIdle() {
        storesMutex.withLock {
            stores.values.forEach { it.idle() }
        }
    }

    /**
     * Drops all [Store] instances.
     */
    suspend fun reset() {
        storesMutex.withLock {
            stores.values.also {
                stores.clear()
            }
        }.forEach {
            it.close()
        }
    }
}

/**
 * This is a temporary facade that adapts the provided [StoreManager] to be a
 * [StorageEndpointProvider], with the goal of reducing the scope of change in a single PR.
 *
 * Eventually, we will remove this in favor of a [StorageEndpointProvider] passed directly to
 * [EntityHandleManager].
 */
fun StoreManager.asStoreEndpointProvider() = object : StorageEndpointProvider {
    override fun <Data : CrdtData, Op : CrdtOperationAtTime, ConsumerData> createStorageEndpoint(
        storeOptions: StoreOptions,
        callback: ProxyCallback<Data, Op, ConsumerData>
    ): StorageEndpoint<Data, Op, ConsumerData> {
        val store = runBlocking {
            get<Data, Op, ConsumerData>(storeOptions)
        }

        return object : StorageEndpoint<Data, Op, ConsumerData> {
            private val id = store.on(callback)
            override suspend fun idle() = store.idle()

            override suspend fun onProxyMessage(
                message: ProxyMessage<Data, Op, ConsumerData>
            ) = store.onProxyMessage(message.withId(id))

            override fun close() = store.off(id)
        }
    }
}
