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
import arcs.core.storage.ProxyMessage.Type

/** A message coming from the storage proxy into one of the [IStore] implementations. */
sealed class ProxyMessage<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    /** Identifier for the sender of the [ProxyMessage]. */
    open val id: Int?,
    /** [Type] of the message. */
    internal open val type: Type
) {

    fun withId(id: Int): ProxyMessage<Data, Op, ConsumerData> = when (this) {
        is SyncRequest -> copy(id = id)
        is ModelUpdate -> copy(id = id)
        is Operations -> copy(id = id)
    }

    /** A request to sync data with the store. */
    data class SyncRequest<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
        override val id: Int?,
        override val type: Type = Type.SyncRequest
    ) : ProxyMessage<Data, Op, ConsumerData>(id, type)

    /**
     * A message requesting an update of the backing data in the store using a state-based CRDT
     * update.
     */
    data class ModelUpdate<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
        /** The new model data. */
        val model: Data,
        override val id: Int?,
        override val type: Type = Type.ModelUpdate
    ) : ProxyMessage<Data, Op, ConsumerData>(id, type)

    /** A message requesting an update of the backing data in the store using [CrdtOperation]s. */
    data class Operations<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
        /** Operations required to update the backing data. */
        val operations: List<Op>,
        override val id: Int?,
        override val type: Type = Type.Operations
    ) : ProxyMessage<Data, Op, ConsumerData>(id, type)

    /** Type of message coming from the Storage Proxy. */
    enum class Type {
        SyncRequest,
        ModelUpdate,
        Operations,
    }
}

/**
 * A callback for listening to [ProxyMessage]s.
 *
 * Usage:
 *
 * ```kotlin
 * val myCallback = ProxyCallback<FooData, FooOperation, RawFoo> { message ->
 *   when (message) {
 *     is ProxyMessage.SyncRequest -> handleSync()
 *     is ProxyMessage.ModelUpdate -> handleModelUpdate(message.model)
 *     is ProxyMessage.Operations -> handleOperations(message.operations)
 *   }
 * }
 * ```
 */
interface ProxyCallback<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
    val singleCallback: suspend (ProxyMessage<Data, Op, ConsumerData>) -> Unit
        get() = throw UnsupportedOperationException("Single callback not supported.")
    val multiCallback: suspend (ProxyMessage<Data, Op, ConsumerData>, String) -> Unit
        get() = throw UnsupportedOperationException("Multiplexed callback not supported")

    suspend operator fun invoke(
        message: ProxyMessage<Data, Op, ConsumerData>,
        muxId: String? = null
    ) = muxId?.let { multiCallback(message, muxId) } ?: singleCallback(message)
}

/** Pseudo-constructor for a [ProxyCallback] capable of receiving direct messages. */
fun <Data : CrdtData, Op : CrdtOperation, ConsumerData> ProxyCallback(
    callback: suspend (message: ProxyMessage<Data, Op, ConsumerData>) -> Unit
): ProxyCallback<Data, Op, ConsumerData> = object : ProxyCallback<Data, Op, ConsumerData> {
    override val singleCallback = callback
}

/** Pseudo-constructor for a [ProxyCallback] capable of receiving multiplexed messages. */
fun <Data : CrdtData, Op : CrdtOperation, ConsumerData> MultiplexedProxyCallback(
    callback: suspend (message: ProxyMessage<Data, Op, ConsumerData>, muxId: String) -> Unit
): ProxyCallback<Data, Op, ConsumerData> = object : ProxyCallback<Data, Op, ConsumerData> {
    override val multiCallback = callback
}

/** Interface common to an [ActiveStore] and the PEC, used by the Storage Proxy. */
interface StorageCommunicationEndpoint<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
    suspend fun onProxyMessage(message: ProxyMessage<Data, Op, ConsumerData>): Boolean

    /** Signal to the endpoint provider that the client is finished using this endpoint. */
    fun close()
}

/** Provider of a [StorageCommunicationEndpoint]. */
interface StorageCommunicationEndpointProvider<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
    /**
     * Implementers should return a [StorageCommunicationEndpoint] that signals information back to
     * the agent using the provided `callback`.
     */
    fun getStorageEndpoint(
        callback: ProxyCallback<Data, Op, ConsumerData>
    ): StorageCommunicationEndpoint<Data, Op, ConsumerData>

    /** Return the [StorageKey] that the store behind this implementation is representing. */
    val storageKey: StorageKey
}
