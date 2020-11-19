package arcs.sdk.android.storage

import arcs.android.storage.decodeProxyMessage
import arcs.android.storage.service.IStorageService
import arcs.android.storage.service.IStorageServiceCallback
import arcs.android.storage.service.suspendForRegistrationCallback
import arcs.android.storage.service.suspendForResultCallback
import arcs.android.storage.toProto
import arcs.core.common.CounterFlow
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageEndpoint
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StoreOptions
import arcs.core.util.TaggedLog
import arcs.sdk.android.storage.service.BindHelper
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.StorageServiceIntentHelpers
import arcs.sdk.android.storage.service.bindForIntent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * An implementation of a [StorageEndpointManager] that provides channels to stores that are
 * managed by an Android [StorageService].
 *
 * @param scope the [CoroutineScope] that will bind/unbind for the storage service, as well
 *        as run callbacks from the storage service. All connections created by this manager will
 *        be disconnected if the scope is cancelled.
 * @param connectionFactory the [ConnectionFactory] to use when connecting to the storage service.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AndroidStorageServiceEndpointManager(
  private val scope: CoroutineScope,
  private val bindHelper: BindHelper,
  private val storageServiceClass: Class<*> = StorageService::class.java
) : StorageEndpointManager {
  override suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
    storeOptions: StoreOptions,
    callback: ProxyCallback<Data, Op, T>
  ): StorageEndpoint<Data, Op, T> {
    // Connect on the provided scope
    val intent = StorageServiceIntentHelpers.storageServiceIntent(
      bindHelper.context,
      storeOptions,
      storageServiceClass
    )
    val boundService = bindHelper.bindForIntent(intent, scope, IStorageService.Stub::asInterface)
    val channelId = suspendForRegistrationCallback { resultCallback ->
      boundService.service.registerCallback(
        StorageServiceProxyCallback(scope, callback),
        resultCallback
      )
    }

    return AndroidStorageEndpoint(channelId, boundService.service) { boundService.disconnect() }
  }
}

/**
 * An implementation of [StorageEndpoint] that communicate with its [ActiveStore] via the Android
 * [StorageService]. These are provided by [AndroidStorageServiceEndpointManager].
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AndroidStorageEndpoint<Data : CrdtData, Op : CrdtOperationAtTime, T> constructor(
  private val channelId: Int,
  private val service: IStorageService,
  private val onClose: () -> Unit
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
    try {
      suspendForResultCallback { resultCallback ->
        service.sendProxyMessage(
          message.withId(channelId).toProto().toByteArray(),
          resultCallback
        )
      }
    } catch (e: CrdtException) {
      // Just return false if the message couldn't be applied.
      log.debug(e) { "CrdtException occurred in onProxyMessage" }
    } finally {
      outgoingMessagesCount.decrement()
    }
  }

  override suspend fun close() {
    suspendForResultCallback { resultCallback ->
      service.unregisterCallback(channelId, resultCallback)
    }
    onClose()
  }

  companion object {
    private const val TIMEOUT_IDLE_WAIT_MILLIS = 10000L
  }
}

/**
 * A helper class that wraps a [ProxyCallback] as an [IStorageServiceCallback], running the
 * callbacks on the provided [CoroutineScope].
 */
@OptIn(ExperimentalCoroutinesApi::class)
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
