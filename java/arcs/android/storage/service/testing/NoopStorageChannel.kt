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
import arcs.jvm.util.JvmTime
import kotlinx.coroutines.CoroutineScope

/** No-op implementation of [IStorageChannel] used for testing. */
open class NoopStorageChannel(
  scope: CoroutineScope,
  statisticsSink: TransactionStatisticsSink = TransactionStatisticsImpl(JvmTime)
) : BaseStorageChannel(scope, statisticsSink) {
  override val tag = "NoopStorageChannel"

  override suspend fun idleStore() {}

  override suspend fun close() {}

  override fun sendMessage(encodedMessage: ByteArray?, resultCallback: IResultCallback?) {}
}
