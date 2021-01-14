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
import arcs.android.storage.service.IResultCallback
import arcs.core.util.statistics.TransactionStatisticsImpl
import arcs.core.util.statistics.TransactionStatisticsSink
import kotlinx.coroutines.CoroutineScope

/** No-op implementation of [IStorageChannel] used for testing. */
open class NoopStorageChannel(
  scope: CoroutineScope,
  statisticsSink: TransactionStatisticsSink = TransactionStatisticsImpl()
) : BaseStorageChannel(scope, statisticsSink) {
  override val tag = "NoopStorageChannel"

  init {
    // Connection to a store is simulated by setting the listenerToken
    listenerToken = 0
  }
  override suspend fun idleStore() {}

  override suspend fun close() {}

  override fun sendMessage(encodedMessage: ByteArray?, resultCallback: IResultCallback?) {}
}
