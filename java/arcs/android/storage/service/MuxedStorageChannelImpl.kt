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

import arcs.android.storage.StorageServiceMessageProto
import arcs.android.storage.decode
import arcs.android.storage.decodeStorageServiceMessageProto
import arcs.android.storage.toProto
import arcs.core.storage.DirectStoreMuxer
import arcs.core.storage.UntypedDirectStoreMuxer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

/** Implementation of [IStorageChannel] for communicating with a [DirectStoreMuxer]. */
class MuxedStorageChannelImpl(
  private val directStoreMuxer: UntypedDirectStoreMuxer,
  private val scope: CoroutineScope,
  private val statisticsSink: BindingContextStatisticsSink
) : IStorageChannel.Stub() {
  private val actionLauncher = SequencedActionLauncher(scope)

  // Register a callback on the DirectStoreMuxer, which proxies responses back to the
  // storageChannelCallback.
  var listenerToken: Int? = null

  override fun idle(timeoutMillis: Long, resultCallback: IResultCallback) {
    // Don't use the SequencedActionLauncher, since we don't want an idle call to wait for other
    // idle calls to complete.
    scope.launch {
      statisticsSink.traceAndMeasure("idle") {
        resultCallback.wrapException("idle failed") {
          checkChannelIsOpen()
          withTimeout(timeoutMillis) {
            actionLauncher.waitUntilDone()
            directStoreMuxer.idle()
          }
        }
      }
    }
  }

  override fun sendMessage(encodedMessage: ByteArray, resultCallback: IResultCallback) {
    actionLauncher.launch {
      statisticsSink.traceAndMeasure("MuxedStorageChannel.sendMessage") {
        resultCallback.wrapException("sendMessage failed") {
          checkChannelIsOpen()
          val proto = encodedMessage.decodeStorageServiceMessageProto()
          require(proto.messageCase == StorageServiceMessageProto.MessageCase.MUXED_PROXY_MESSAGE) {
            "Expected a MuxedProxyMessageProto, but received ${proto.messageCase}"
          }
          val muxedMessage = proto.muxedProxyMessage.decode()
          directStoreMuxer.onProxyMessage(muxedMessage)
        }
      }
    }
  }

  override fun close(resultCallback: IResultCallback) {
    actionLauncher.launch {
      statisticsSink.traceAndMeasure("MuxedStorageChannel.close") {
        resultCallback.wrapException("close failed") {
          val token = checkNotNull(listenerToken) { "Channel has already been closed" }
          directStoreMuxer.off(token)
          listenerToken = null
        }
      }
    }
  }

  private fun checkChannelIsOpen() {
    checkNotNull(listenerToken) { "Channel is closed" }
  }

  companion object {
    suspend fun create(
      directStoreMuxer: UntypedDirectStoreMuxer,
      scope: CoroutineScope,
      statisticsSink: BindingContextStatisticsSink,
      messageCallback: IMessageCallback
    ): MuxedStorageChannelImpl {
      return MuxedStorageChannelImpl(directStoreMuxer, scope, statisticsSink)
        .also {
          it.listenerToken = directStoreMuxer.on { message ->
            val proto = StorageServiceMessageProto.newBuilder()
              .setMuxedProxyMessage(message.toProto())
              .build()
            messageCallback.onMessage(proto.toByteArray())
          }
        }
    }
  }
}
