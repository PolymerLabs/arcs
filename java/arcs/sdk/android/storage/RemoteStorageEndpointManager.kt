package arcs.sdk.android.storage

import arcs.android.storage.RemoteMessageProto
import arcs.android.util.decodeProto
import arcs.core.common.CounterFlow
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.storage.ActiveStore
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageEndpoint
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreOptions
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.BroadcastChannel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/**
 * A [StorageEndpointManager] that creates [DirectStorageEndpointProviders] wrapping the stores
 * provided in the [stores] parameter.
 */
class RemoteStorageEndpointManager(
  private val sendChannel: Channel<ByteArray>,
  private val recvChannel: BroadcastChannel<ByteArray>,
  private val scope: CoroutineScope
  ) : StorageEndpointManager {

  var nextMsgId = atomic(1)
  var nextChannelId = atomic(1)

  val msgIdProvider = { nextMsgId.incrementAndGet() }
  val channelIdProvider = { nextChannelId.incrementAndGet() }

  val stores: MutableMap<StorageKey, RemoteStorageEndpoint<*, *, *>> = mutableMapOf()

  override suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
    storeOptions: StoreOptions,
    callback: ProxyCallback<Data, Op, T>
  ): StorageEndpoint<Data, Op, T> {
    return stores.getOrPut(storeOptions.storageKey) {
      val channelId = channelIdProvider()
      val protoChannel = ProtoChannel<Data, Op, T>(sendChannel, recvChannel, channelId, msgIdProvider)
      protoChannel.sendConnect(storeOptions)

      return Unit.let {
        RemoteStorageEndpoint<Data, Op, T>(
          sendChannel,
          recvChannel,
          msgIdProvider,
          channelId,
          protoChannel
        )
      }.also {
        protoChannel.startClient(callback, scope)
      }
    } as RemoteStorageEndpoint<Data, Op, T>
  }
}

private suspend fun BroadcastChannel<ByteArray>.waitForAck(channelId: Int, id: Int) =
  this.openSubscription().consumeAsFlow().map { message ->
    decodeProto(message, RemoteMessageProto.getDefaultInstance())
  }.filter {
    it.hasAckMessage() && it.channelId == channelId
  }.map {
    println(it.ackMessage)
    it.ackMessage
  }.first { it.messageId == id }

/** A [StorageEndpoint] that directly wraps an [ActiveStore]. */
class RemoteStorageEndpoint<Data : CrdtData, Op : CrdtOperationAtTime, T>(
  private val sendChannel: Channel<ByteArray>,
  private val recvChannel: BroadcastChannel<ByteArray>,
  private val msgIdProvider: () -> Int,
  private val channelId: Int,
  private val protoChannel: ProtoChannel<Data, Op, T>
) : StorageEndpoint<Data, Op, T> {
  private val outgoingMessagesCount = CounterFlow(0)

  override suspend fun idle() {
    outgoingMessagesCount.flow.first { it == 0 }
    protoChannel.sendIdle()
  }

  override suspend fun onProxyMessage(
    message: ProxyMessage<Data, Op, T>
  ) {
    outgoingMessagesCount.increment()
    try {
      protoChannel.sendProxyMessage(message)
    } finally {
      outgoingMessagesCount.decrement()
    }
  }

  override suspend fun close() {
//    protoChannel.sendClose()
    println("Close called2")
    val msgId = msgIdProvider()
    sendChannel.send(
      RemoteMessageProto.newBuilder().setMessageId(
        msgId
      ).setChannelId(channelId).setCloseMessage(RemoteMessageProto.CloseMessageProto.getDefaultInstance()).build().toByteArray()
    )
    // send close message
    recvChannel.waitForAck(channelId, msgId)
  }
}
