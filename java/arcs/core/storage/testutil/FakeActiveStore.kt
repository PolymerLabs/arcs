/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage.testutil

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ActiveStore
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StoreOptions

/** [FakeActiveStore] is used to test exception handling for callback registration. */
class FakeActiveStore<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
  options: StoreOptions
) : ActiveStore<Data, Op, ConsumerData>(options) {

  override suspend fun on(callback: ProxyCallback<Data, Op, ConsumerData>): Int =
    throw IllegalStateException("Intentionally thrown!")

  override suspend fun idle() = Unit

  override suspend fun off(callbackToken: Int) = Unit

  override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, ConsumerData>) = Unit

  override fun close() = Unit
}
