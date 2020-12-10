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
import arcs.core.type.Type

/** An [ActiveStore] that accepts any data type. */
typealias UntypedActiveStore = ActiveStore<CrdtData, CrdtOperation, Any?>

/**
 * Representation of an *active* store.
 *
 * Subclasses of this must provide specific behavior as-controlled by the [StorageMode] provided
 * within the [StoreOptions].
 */
abstract class ActiveStore<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
  options: StoreOptions
) : IStore<Data, Op, ConsumerData> {
  override val storageKey: StorageKey = options.storageKey
  override val type: Type = options.type

  /** Suspends until all pending operations are complete. */
  abstract suspend fun idle()

  /**
   * Registers a [ProxyCallback] with the store and returns a token which can be used to
   * unregister the callback using [off].
   */
  abstract suspend fun on(callback: ProxyCallback<Data, Op, ConsumerData>): Int

  /** Unregisters a callback associated with the given [callbackToken]. */
  abstract suspend fun off(callbackToken: Int)

  /** Handles a message from the storage proxy. */
  abstract suspend fun onProxyMessage(message: ProxyMessage<Data, Op, ConsumerData>)

  /** Performs any operations that are needed to release resources held by this [ActiveStore]. */
  abstract fun close()
}
