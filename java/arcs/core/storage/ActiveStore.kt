/*
 * Copyright 2019 Google LLC.
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
import arcs.core.crdt.CrdtOperation
import arcs.core.type.Type

/**
 * Representation of an *active* store.
 *
 * Subclasses of this must provide specific behavior as-controlled by the [StorageMode] provided
 * within the [StoreOptions].
 */
abstract class ActiveStore<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    options: StoreOptions<Data, Op, ConsumerData>
) : IStore<Data, Op, ConsumerData>, StorageCommunicationEndpointProvider<Data, Op, ConsumerData> {
    override val mode: StorageMode = options.mode
    override val storageKey: StorageKey = options.storageKey
    override val type: Type = options.type
    open val versionToken: String? = options.versionToken
    /** The [IStore] this instance is fronting. */
    val baseStore: IStore<Data, Op, ConsumerData>? = options.baseStore

    /** Returns the model [Data]. */
    abstract suspend fun getLocalData(): Data

    /** Suspends until all pending operations are complete. */
    open suspend fun idle() = Unit

    /**
     * Registers a [ProxyCallback] with the store and returns a token which can be used to
     * unregister the callback using [off].
     */
    abstract fun on(callback: ProxyCallback<Data, Op, ConsumerData>): Int

    /** Unregisters a callback associated with the given [callbackToken]. */
    abstract fun off(callbackToken: Int)

    /** Handles a message from the storage proxy. */
    abstract suspend fun onProxyMessage(message: ProxyMessage<Data, Op, ConsumerData>): Boolean

    override fun getStorageEndpoint(): StorageCommunicationEndpoint<Data, Op, ConsumerData> {
        return object : StorageCommunicationEndpoint<Data, Op, ConsumerData> {
            var id: Int? = null

            override fun setCallback(callback: ProxyCallback<Data, Op, ConsumerData>): Int =
                on(callback).also { id = it }

            override suspend fun onProxyMessage(
                message: ProxyMessage<Data, Op, ConsumerData>
            ): Boolean {
                val messageCopy: ProxyMessage<Data, Op, ConsumerData> = when (message) {
                    is ProxyMessage.SyncRequest -> ProxyMessage.SyncRequest(id)
                    is ProxyMessage.ModelUpdate -> ProxyMessage.ModelUpdate(message.model, id)
                    is ProxyMessage.Operations -> ProxyMessage.Operations(message.operations, id)
                }
                return this@ActiveStore.onProxyMessage(messageCopy)
            }
        }
    }

    /** Clones data from the given store into this one. */
    suspend fun cloneFrom(store: ActiveStore<Data, Op, ConsumerData>) {
        onProxyMessage(ProxyMessage.ModelUpdate(store.getLocalData(), id = null))
    }
}
