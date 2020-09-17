package arcs.sdk.android.storage

import arcs.android.crdt.toParcelableType
import arcs.android.storage.decodeProxyMessage
import arcs.android.storage.service.IStorageService
import arcs.android.storage.service.IStorageServiceCallback
import arcs.android.storage.service.suspendForRegistrationCallback
import arcs.android.storage.service.suspendForResultCallback
import arcs.android.storage.toProto
import arcs.core.common.CounterFlow
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageEndpoint
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StoreOptions
import arcs.core.util.TaggedLog
import arcs.sdk.android.storage.service.ConnectionFactory
import arcs.sdk.android.storage.service.StorageServiceConnection
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * An implementation of a [StorageEndpointManager] that provides channels to stores that are
 * managed by an Android [StorageService].
 *
 * @param coroutineScope the [CoroutineScope] that will bind/unbind for the storage service, as well
 *        as run callbacks from the storage service. All connections created by this manager will
 *        be disconnected if the scope is cancelled.
 * @param connectionFactory the [ConnectionFactory] to use when connecting to the storage service.
 */
@ExperimentalCoroutinesApi
class AndroidStorageServiceEndpointManager(
  private val coroutineScope: CoroutineScope,
  private val connectionFactory: ConnectionFactory
) : StorageEndpointManager {
  // Get the job out of the provided coroutine scope so we can attach disconnection events to it.
  // It should be possible for the Job to be null, but since the lookup signature indicates that
  // null can be returned, we check it here.
  private val scopeJob = requireNotNull(coroutineScope.coroutineContext[Job.Key]) {
    "Provided CoroutineScope must have a Job element"
  }

  override suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
    storeOptions: StoreOptions,
    callback: ProxyCallback<Data, Op, T>
  ): StorageEndpoint<Data, Op, T> {
    // Connect on the provided scope
    val connection = connectionFactory(storeOptions, storeOptions.type.toParcelableType())
    val service = IStorageService.Stub.asInterface(connection.connectAsync().await())
    val channelId = suspendForRegistrationCallback { resultCallback ->
      service.registerCallback(
        StorageServiceProxyCallback(coroutineScope, callback),
        resultCallback
      )
    }

    // If the provided scope completes while we're still connected, disconnect everything.
    scopeJob.invokeOnCompletion {
      connection.disconnect()
    }

    return AndroidStorageEndpoint<Data, Op, T>(channelId, service, connection)
  }
}

/**
 * An implementation of [StorageEndpoint] that communicate with its [ActiveStore] via the Android
 * [StorageService]. These are provided by [AndroidStorageServiceEndpointManager].
 */
@ExperimentalCoroutinesApi
class AndroidStorageEndpoint<Data : CrdtData, Op : CrdtOperationAtTime, T> internal constructor(
  private val channelId: Int,
  private val service: IStorageService,
  private val connection: StorageServiceConnection
) : StorageEndpoint<Data, Op, T> {
  private val outgoingMessagesCount = CounterFlow(0)

  private val log = TaggedLog { "AndroidStorageEndpoint" }

  override suspend fun idle() {
    log.debug { "Waiting for service store to be idle" }
    outgoingMessagesCount.flow.first { it == 0 }
    suspendForResultCallback { resultCallback ->
      service.idle(TIMEOUT_IDLE_WAIT_MILLIS, resultCallback)
    }
    log.debug { "Endpoint is idle" }
  }

  override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, T>) {
    outgoingMessagesCount.increment()
    service.sendProxyMessage(message.withId(channelId).toProto().toByteArray())
  }

  override suspend fun close() {
    suspendForResultCallback { resultCallback ->
      service.unregisterCallback(channelId, resultCallback)
    }
    connection.disconnect()
  }

  companion object {
    private const val TIMEOUT_IDLE_WAIT_MILLIS = 10000L
  }
}

/**
 * A helper class that wraps a [ProxyCallback] as an [IStorageServiceCallback], running the
 * callbacks on the provided [CoroutineScope].
 */
@ExperimentalCoroutinesApi
private class StorageServiceProxyCallback<Data : CrdtData, Op : CrdtOperation, T>(
  private val scope: CoroutineScope,
  private val callback: ProxyCallback<Data, Op, T>
) : IStorageServiceCallback.Stub() {
  override fun onProxyMessage(proxyMessage: ByteArray) {
    scope.launch(start = CoroutineStart.UNDISPATCHED) {
      @Suppress("UNCHECKED_CAST")
      callback(
        proxyMessage.decodeProxyMessage()
          as ProxyMessage<Data, Op, T>
      )
    }
  }
}
