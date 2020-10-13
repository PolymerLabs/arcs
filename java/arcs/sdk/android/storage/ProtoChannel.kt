package arcs.sdk.android.storage

import arcs.android.storage.RemoteMessage
import arcs.android.storage.RemoteMessageProto
import arcs.android.storage.decode
import arcs.android.storage.toProto
import arcs.android.util.decodeProto
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StoreOptions
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.BroadcastChannel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach

class ProtoChannel<Data : CrdtData, Op : CrdtOperationAtTime, T>(
  val sendChannel: Channel<ByteArray>,
  val recvChannel: BroadcastChannel<ByteArray>,
  val channelId: Int,
  val msgIdProvider: () -> Int
) {
  var nextMessageId = 1
  fun newEnvelope() =
    RemoteMessageProto.newBuilder().setMessageId(msgIdProvider()).setChannelId(channelId)

  fun newClose() =
    newEnvelope().setCloseMessage(RemoteMessageProto.CloseMessageProto.getDefaultInstance()).build()

  fun newIdle() =
    newEnvelope().setIdleMessage(RemoteMessageProto.IdleMessageProto.getDefaultInstance()).build()

  fun newConnect(storeOptions: StoreOptions) =
    newEnvelope().setConnectMessage(
      RemoteMessageProto.ConnectMessageProto.newBuilder().setStoreOptions(storeOptions.toProto()).build()
    ).build()

  fun newProxyMessage(message: ProxyMessage<Data, Op, T>) =
    newEnvelope().setProxyMessage(message.toProto()).build()

  suspend fun sendClose() {
    val closeMsg = newClose()
    sendChannel.send(closeMsg.toByteArray())
//    recvChannel.waitForAck(channelId, closeMsg.messageId)
  }

  suspend fun sendIdle() {
    val idleMsg = newIdle()
    sendChannel.send(idleMsg.toByteArray())
    recvChannel.waitForAck(channelId, idleMsg.messageId)
  }

  suspend fun sendConnect(storeOptions: StoreOptions) {
    val connectMsg = newConnect(storeOptions)
    sendChannel.send(connectMsg.toByteArray())
    recvChannel.waitForAck(channelId, connectMsg.messageId)
  }

  suspend fun sendProxyMessage(message: ProxyMessage<Data, Op, T>) {
    val proxyMessage = newProxyMessage(message)
    sendChannel.send(proxyMessage.toByteArray())
    recvChannel.waitForAck(channelId, proxyMessage.messageId)
  }

  suspend fun sendProxyMessageToClient(channelId: Int, message: ProxyMessage<Data, Op, T>) {
    val proxyMessage = RemoteMessageProto.newBuilder()
      .setChannelId(channelId)
      .setMessageId(msgIdProvider())
      .setProxyMessage(message.toProto())
      .build()
    recvChannel.send(proxyMessage.toByteArray())
  }

  suspend fun sendAck(channelId: Int, msgId: Int) {
    val ackMsg = RemoteMessageProto.newBuilder()
      .setChannelId(channelId)
      .setMessageId(msgId)
      .setAckMessage(
        RemoteMessageProto.AckMessageProto.newBuilder().setMessageId(msgId).build()
      ).build()
    println("Sending ack froms server for channelId = ${ackMsg.channelId}, id=${ackMsg.messageId}")
    recvChannel.send(ackMsg.toByteArray())
  }

  fun startClient(
    callback: ProxyCallback<Data, Op, T>,
    scope: CoroutineScope
  ) {
    recvChannel.openSubscription().consumeAsFlow().map { message ->
      decodeProto(message, RemoteMessageProto.getDefaultInstance())
    }.filter {
      it.channelId == channelId
    }.filter {
      it.hasProxyMessage()
    }.map {
      it.proxyMessage.decode()
    }.onEach {
      println("Received $it proxy message invoking callback for channel id $channelId")
      callback(it as ProxyMessage<Data, Op, T>)
    }.launchIn(scope)
  }

  fun startServer(
    scope: CoroutineScope,
    callback: suspend (RemoteMessageProto) -> Unit
  ) {
    sendChannel.consumeAsFlow().map { message ->
      decodeProto(message, RemoteMessageProto.getDefaultInstance())
    }.onEach { callback(it) }.launchIn(scope)
  }

  suspend fun close() {

  }

  private suspend fun BroadcastChannel<ByteArray>.waitForAck(channelId: Int, id: Int) {
    println("Waiting for Ack channel=$channelId, id=$id")
    this.openSubscription().consumeAsFlow().map { message ->
      decodeProto(message, RemoteMessageProto.getDefaultInstance())
    }.filter { it.hasAckMessage() && it.channelId == channelId }
      .first { it.messageId == id }
    println("Ack received channel=$channelId, id=$id")
  }
}


