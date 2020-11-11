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

package arcs.core.storage.testutil

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ProxyCallback
import arcs.core.storage.StoreOptions
import arcs.core.storage.UntypedActiveStore
import arcs.core.storage.UntypedProxyMessage

/** No-op implementation of [ActiveStore] used for testing. */
open class NoopActiveStore(storeOptions: StoreOptions) : UntypedActiveStore(storeOptions) {
  override suspend fun idle() {}

  override suspend fun on(callback: ProxyCallback<CrdtData, CrdtOperation, Any?>): Int = 0

  override suspend fun off(callbackToken: Int) {}

  override suspend fun onProxyMessage(message: UntypedProxyMessage) {}

  override fun close() {}
}
