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

package arcs.android.storage.service

import arcs.core.util.statistics.TransactionStatisticsSink
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

/** Base functionality common to all storage channels. */
abstract class BaseStorageChannel(
  private val scope: CoroutineScope,
  private val statisticsSink: TransactionStatisticsSink
) : IStorageChannel.Stub() {
  /** Identifier for the class. Used as the tag for tracing a transaction. */
  protected abstract val tag: String

  protected val actionLauncher = SequencedActionLauncher(scope)

  protected var listenerToken: Int? = null

  override fun idle(timeoutMillis: Long, resultCallback: IResultCallback?) {
    // Don't use the SequencedActionLauncher, since we don't want an idle call to wait for other
    // idle calls to complete.
    scope.launch {
      statisticsSink.traceAndMeasure("$tag.idle") {
        resultCallback?.wrapException("idle failed") {
          checkChannelIsOpen()
          withTimeout(timeoutMillis) {
            actionLauncher.waitUntilDone()
            idleStore()
          }
        }
      }
    }
  }

  override fun close(resultCallback: IResultCallback?) {
    actionLauncher.launch {
      statisticsSink.traceAndMeasure("$tag.close") {
        resultCallback?.wrapException("close failed") {
          val token = checkNotNull(listenerToken) { "Channel has already been closed" }
          unregisterFromStore(token)
          listenerToken = null
        }
      }
    }
  }

  protected fun checkChannelIsOpen() {
    checkNotNull(listenerToken) { "Channel is closed" }
  }

  /** Calls [idle] on the store that this channel communicates with. */
  abstract suspend fun idleStore()

  /** Unregister from the store that this channel communicates with. */
  abstract suspend fun unregisterFromStore(token: Int)
}
