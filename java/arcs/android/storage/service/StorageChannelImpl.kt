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
import arcs.core.storage.StorageKey
import arcs.core.storage.UntypedActiveStore
import arcs.core.storage.UntypedProxyMessage
import kotlinx.coroutines.CoroutineScope

/** Implementation of [IStorageChannel] for communicating with an [ActiveStore]. */
class StorageChannelImpl(
  private val store: UntypedActiveStore,
  scope: CoroutineScope,
  private val statisticsSink: BindingContextStatisticsSink,
  /** Callback to trigger when a proxy message has been received and sent to the store. */
  private val onProxyMessageCallback: suspend (StorageKey, UntypedProxyMessage) -> Unit
) : BaseStorageChannel(scope, statisticsSink) {
  override val tag = "StorageChannel"

  override fun sendMessage(encodedMessage: ByteArray, resultCallback: IResultCallback) {
    actionLauncher.launch {
      statisticsSink.traceAndMeasure("$tag.sendMessage") {
        resultCallback.wrapException("sendMessage failed") {
          checkChannelIsOpen()
          val proto = encodedMessage.decodeStorageServiceMessageProto()
          require(proto.messageCase == StorageServiceMessageProto.MessageCase.PROXY_MESSAGE) {
            "Expected a ProxyMessageProto, but received ${proto.messageCase}"
          }
          val message = proto.proxyMessage.decode()
          store.onProxyMessage(message.withId(listenerToken!!))
          onProxyMessageCallback(store.storageKey, message)
        }
      }
    }
  }

  override suspend fun idleStore() {
    store.idle()
  }

  override suspend fun unregisterFromStore(token: Int) {
    store.off(token)
  }

  companion object {
    suspend fun create(
      store: UntypedActiveStore,
      scope: CoroutineScope,
      statisticsSink: BindingContextStatisticsSink,
      callback: IMessageCallback,
      onProxyMessageCallback: suspend (StorageKey, UntypedProxyMessage) -> Unit
    ): StorageChannelImpl {
      return StorageChannelImpl(store, scope, statisticsSink, onProxyMessageCallback).also {
        it.listenerToken = store.on { message ->
          callback.onMessage(
            StorageServiceMessageProto.newBuilder()
              .setProxyMessage(message.toProto())
              .build()
              .toByteArray()
          )
        }
      }
    }
  }
}
