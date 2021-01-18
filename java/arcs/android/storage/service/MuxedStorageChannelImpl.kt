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
import arcs.core.storage.MuxedProxyMessage
import arcs.core.storage.UntypedDirectStoreMuxer
import arcs.core.util.statistics.TransactionStatisticsSink
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import kotlinx.coroutines.CoroutineScope

/** Implementation of [IStorageChannel] for communicating with a [DirectStoreMuxer]. */
class MuxedStorageChannelImpl(
  private val directStoreMuxer: UntypedDirectStoreMuxer,
  scope: CoroutineScope,
  private val listenerToken: Int,
  private val statisticsSink: TransactionStatisticsSink
) : BaseStorageChannel(scope, statisticsSink) {
  init {
    if (!BuildFlags.ENTITY_HANDLE_API) {
      throw BuildFlagDisabledError("ENTITY_HANDLE_API")
    }
  }

  override val tag = "MuxedStorageChannel"

  override fun sendMessage(encodedMessage: ByteArray, resultCallback: IResultCallback) {
    actionLauncher.launch {
      statisticsSink.traceAndMeasure("$tag.sendMessage") {
        resultCallback.wrapException("sendMessage failed") {
          checkChannelIsOpen()
          val proto = encodedMessage.decodeStorageServiceMessageProto()
          require(proto.messageCase == StorageServiceMessageProto.MessageCase.MUXED_PROXY_MESSAGE) {
            "Expected a MuxedProxyMessageProto, but received ${proto.messageCase}"
          }
          val muxedMessage = proto.muxedProxyMessage.decode()
          directStoreMuxer.onProxyMessage(
            MuxedProxyMessage(muxedMessage.muxId, muxedMessage.message.withId(listenerToken))
          )
        }
      }
    }
  }

  override suspend fun idleStore() {
    directStoreMuxer.idle()
  }

  override suspend fun close() {
    directStoreMuxer.off(listenerToken)
  }

  companion object {
    suspend fun create(
      directStoreMuxer: UntypedDirectStoreMuxer,
      scope: CoroutineScope,
      statisticsSink: TransactionStatisticsSink,
      messageCallback: IMessageCallback
    ): MuxedStorageChannelImpl {
      val listenerToken = directStoreMuxer.on { message ->
        val proto = StorageServiceMessageProto.newBuilder()
          .setMuxedProxyMessage(message.toProto())
          .build()
        messageCallback.onMessage(proto.toByteArray())
      }
      return MuxedStorageChannelImpl(directStoreMuxer, scope, listenerToken, statisticsSink)
    }
  }
}
