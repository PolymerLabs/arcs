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
import arcs.core.crdt.CrdtOperationAtTime

/** A message coming from the storage proxy into one of the [IStore] implementations. */
sealed class ProxyMessage<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
  /** Identifier for the sender of the [ProxyMessage]. */
  abstract val id: Int?

  /** [Type] of the message. */
  abstract val type: Type

  fun withId(id: Int): ProxyMessage<Data, Op, ConsumerData> = when (this) {
    is SyncRequest -> copy(id = id)
    is ModelUpdate -> copy(id = id)
    is Operations -> copy(id = id)
    is MuxedProxyMessage -> copy(message = message.withId(id))
  }

  /** A request to sync data with the store. */
  data class SyncRequest<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    override val id: Int?
  ) : ProxyMessage<Data, Op, ConsumerData>() {
    override val type = Type.SyncRequest
  }

  /**
   * A message requesting an update of the backing data in the store using a state-based CRDT
   * update.
   */
  data class ModelUpdate<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    /** The new model data. */
    val model: Data,
    override val id: Int?
  ) : ProxyMessage<Data, Op, ConsumerData>() {
    override val type = Type.ModelUpdate
  }

  /** A message requesting an update of the backing data in the store using [CrdtOperation]s. */
  data class Operations<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    /** Operations required to update the backing data. */
    val operations: List<Op>,
    override val id: Int?
  ) : ProxyMessage<Data, Op, ConsumerData>() {
    override val type = Type.Operations
  }

  data class MuxedProxyMessage<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    val muxId: String,
    val message: ProxyMessage<Data, Op, ConsumerData>
  ): ProxyMessage<Data, Op, ConsumerData>() {
    override val type = Type.MuxedProxyMessage

    override val id = message.id
  }

  /** Type of message coming from the Storage Proxy. */
  enum class Type {
    SyncRequest,
    ModelUpdate,
    Operations,
    MuxedProxyMessage,
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
  suspend operator fun invoke(
    message: ProxyMessage<Data, Op, ConsumerData>
  )
}

fun <Data : CrdtData, Op : CrdtOperation, ConsumerData> ProxyCallback(
  callback: suspend (ProxyMessage<Data, Op, ConsumerData>) -> Unit
) = object : ProxyCallback<Data, Op, ConsumerData> {
  override suspend operator fun invoke(
    message: ProxyMessage<Data, Op, ConsumerData>
  ) = callback(message)
}

class DeferredProxyCallback<Data : CrdtData, Op : CrdtOperation, ConsumerData> : ProxyCallback<Data, Op, ConsumerData> {
  lateinit var callback: suspend (ProxyMessage<Data, Op, ConsumerData>) -> Unit

  override suspend fun invoke(message: ProxyMessage<Data, Op, ConsumerData>) {
    callback(message)
  }
}

/** Interface common to an [ActiveStore] and the PEC, used by the Storage Proxy. */
interface StorageEndpoint<Data : CrdtData, Op : CrdtOperation, ConsumerData> {
  /**
   * Suspends until the endpoint has become idle (typically: when it is finished flushing data to
   * storage media.
   */
  suspend fun idle()

  /**
   * Sends the storage layer a message from a [StorageProxy].
   */
  suspend fun onProxyMessage(message: ProxyMessage<Data, Op, ConsumerData>)

  suspend fun close()
}
