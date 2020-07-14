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
    options: StoreOptions
) : IStore<Data, Op, ConsumerData>, StorageCommunicationEndpointProvider<Data, Op, ConsumerData> {
    override val storageKey: StorageKey = options.storageKey
    override val type: Type = options.type
    open val versionToken: String? = options.versionToken

    /** Suspends until all pending operations are complete. */
    open suspend fun idle() = Unit

    /**
     * Registers a [ProxyCallback] with the store and returns a token which can be used to
     * unregister the callback using [off].
     */
    abstract fun on(callback: ProxyCallback<Data, Op, ConsumerData>): Int

    /** Unregisters a callback associated with the given [callbackToken]. */
    abstract fun off(callbackToken: Int)

    /** Releases any resources this store was using. */
    abstract suspend fun close()

    /** Handles a message from the storage proxy. */
    abstract suspend fun onProxyMessage(message: ProxyMessage<Data, Op, ConsumerData>): Boolean

    /**
     * Return a storage endpoint that will receive messages from the store via the
     * provided callback
     */
    override fun getStorageEndpoint(
        callback: ProxyCallback<Data, Op, ConsumerData>
    ) = object : StorageCommunicationEndpoint<Data, Op, ConsumerData> {
        val id = on(callback)

        override suspend fun idle() = this@ActiveStore.idle()

        override suspend fun onProxyMessage(
            message: ProxyMessage<Data, Op, ConsumerData>
        ) = this@ActiveStore.onProxyMessage(message.withId(id))

        override fun close() = off(id)
    }
}
