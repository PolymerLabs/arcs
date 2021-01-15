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

import android.os.IBinder
import arcs.android.storage.StorageServiceMessageProto
import arcs.android.storage.decode
import arcs.android.storage.decodeStorageServiceMessageProto
import arcs.android.storage.toProto
import arcs.core.storage.StorageKey
import arcs.core.storage.UntypedActiveStore
import arcs.core.storage.UntypedProxyMessage
import arcs.core.util.statistics.TransactionStatisticsSink
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import kotlinx.coroutines.CoroutineScope

/** Implementation of [IStorageChannel] for communicating with an [UntypedActiveStore]. */
class StorageChannelImpl(
  val store: UntypedActiveStore,
  scope: CoroutineScope,
  private val statisticsSink: TransactionStatisticsSink,
  /** Callback to trigger when a proxy message has been received and sent to the store. */
  private val onProxyMessageCallback: suspend (StorageKey, UntypedProxyMessage) -> Unit
) : BaseStorageChannel(scope, statisticsSink) {

  init {
    if (!BuildFlags.STORAGE_SERVICE_NG) {
      throw BuildFlagDisabledError("STORAGE_SERVICE_NG")
    }
  }
  override val tag = "StorageChannel"

  /**
   * An implementation of [IBinder.DeathRecipient] that will remove a store callback if the client
   * process that added it died.
   *
   * This is linked when the callback is attached, and unlinked from death when the callback is
   * removed.
   */
  private val deathRecipient = IBinder.DeathRecipient {
    // Launch this on the action launcher, so it happens after any registrations that may
    // be in flight.
    actionLauncher.launch {
      val token = checkNotNull(listenerToken) {
        "Channel is closed. Can not unregister from store"
      }
      store.off(token)
    }
  }

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
          val token = checkNotNull(listenerToken) {
            "Channel is closed. Can not send messages to store"
          }
          store.onProxyMessage(message.withId(token))
          onProxyMessageCallback(store.storageKey, message)
        }
      }
    }
  }

  override suspend fun idleStore() {
    store.idle()
  }

  override suspend fun close() {
    val token = checkNotNull(listenerToken) { "Channel has already been closed" }
    store.off(token)
    this.asBinder().unlinkToDeath(deathRecipient, UNLINK_TO_DEATH_FLAGS)
  }

  companion object {
    // The documentation provides no information about these flags, and any examples seem to
    // always use 0, so we use 0 here.
    const val UNLINK_TO_DEATH_FLAGS = 0
    private const val LINK_TO_DEATH_FLAGS = 0

    suspend fun create(
      store: UntypedActiveStore,
      scope: CoroutineScope,
      statisticsSink: TransactionStatisticsSink,
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
        it.asBinder().linkToDeath(it.deathRecipient, LINK_TO_DEATH_FLAGS)
      }
    }
  }
}
