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

package arcs.storage

import arcs.crdt.CrdtData
import arcs.crdt.CrdtOperation

/** A message coming from the storage proxy into one of the [IStore] implementations. */
sealed class ProxyMessage<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
  /** Identifier for the [ProxyMessage]. */
  open val id: Int?,
  /** [Type] of the message. */
  internal open val type: Type
) {
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
data class ProxyCallback<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
  private val callback: suspend (ProxyMessage<Data, Op, ConsumerData>) -> Boolean
) {
  // Makes this class behave as if it were a suspend function itself.
  suspend operator fun invoke(message: ProxyMessage<Data, Op, ConsumerData>): Boolean =
    callback.invoke(message)
}

/** Interface common to an [ActiveStore] and the PEC, used by the Storage Proxy. */
interface StorageCommunicationEndpoint<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
  fun setCallback(callback: ProxyCallback<Data, Op, ConsumerData>)
  suspend fun onProxyMessage(message: ProxyMessage<Data, Op, ConsumerData>): Boolean
}

/** Provider of a [StorageCommunicationEndpoint]. */
interface StorageCommunicationEndpointProvider<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
  fun getStorageEndpoint(): StorageCommunicationEndpoint<Data, Op, ConsumerData>
}

