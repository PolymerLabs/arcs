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
import arcs.core.crdt.CrdtOperation

/** A [ProxyMessage] of any data type. */
typealias UntypedProxyMessage = ProxyMessage<CrdtData, CrdtOperation, Any?>

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
typealias ProxyCallback<Data, Op, ConsumerData> =
  suspend (ProxyMessage<Data, Op, ConsumerData>) -> Unit

/**
 * A combination of a [ProxyMessage] and a [muxId], which is typically the reference ID that
 * uniquely identifies the entity store that has generated the message.
 */
data class MuxedProxyMessage<Data : CrdtData, Op : CrdtOperation, T>(
  val muxId: String,
  val message: ProxyMessage<Data, Op, T>
)

/** A convenience for a [CallbackManager] callback that uses a [MuxedProxyMessage] parameter. */
typealias MuxedProxyCallback<Data, Op, T> = suspend (MuxedProxyMessage<Data, Op, T>) -> Unit

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
