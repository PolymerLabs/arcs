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

package arcs.android.storage.service.testing

import arcs.android.storage.service.BaseStorageChannel
import arcs.android.storage.service.BindingContextStatisticsSink
import arcs.android.storage.service.BindingContextStatsImpl
import arcs.android.storage.service.IResultCallback
import kotlinx.coroutines.CoroutineScope

/** No-op implementation of [IStorageChannel] used for testing. */
open class NoopStorageChannel(
  scope: CoroutineScope,
  statisticsSink: BindingContextStatisticsSink = BindingContextStatsImpl()
) : BaseStorageChannel(scope, statisticsSink) {
  override val tag = "NoopStorageChannel"

  init {
    // Connection to a store is simulated by setting the listenerToken
    listenerToken = 0
  }
  override suspend fun idleStore() {}

  override suspend fun unregisterFromStore(token: Int) {}

  override fun sendMessage(encodedMessage: ByteArray?, resultCallback: IResultCallback?) {}
}
