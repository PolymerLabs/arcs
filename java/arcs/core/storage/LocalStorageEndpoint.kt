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

/** A [StorageEndpoint] that directly wraps an [ActiveStore]. */
class LocalStorageEndpoint<Data : CrdtData, Op : CrdtOperationAtTime, T>(
  private val store: ActiveStore<Data, Op, T>,
  private val id: Int
) : StorageEndpoint<Data, Op, T> {
  override suspend fun idle() = store.idle()

  override suspend fun onProxyMessage(
    message: ProxyMessage<Data, Op, T>
  ) = store.onProxyMessage(message.withId(id))

  override suspend fun close() = store.off(id)

  // VisibleForTesting
  val storeForTests
    get() = store
}
