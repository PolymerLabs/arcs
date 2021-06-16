package arcs.sdk.android.storage

import arcs.android.crdt.toParcelableType
import arcs.android.storage.decode
import arcs.android.storage.decodeStorageServiceMessageProto
import arcs.android.storage.service.IMessageCallback
import arcs.android.storage.service.IStorageServiceNg
import arcs.android.storage.service.suspendForOpeningChannel
import arcs.android.storage.toParcelByteArray
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageEndpoint
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StoreOptions
import arcs.sdk.android.storage.service.BindHelper
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.StorageServiceIntentHelpers
import arcs.sdk.android.storage.service.bindForIntent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
  override suspend fun <Data : CrdtData, Op : CrdtOperation, T> get(
    storeOptions: StoreOptions,
    callback: ProxyCallback<Data, Op, T>
  ): StorageEndpoint<Data, Op, T> {
    val intent = StorageServiceIntentHelpers.storageServiceNgIntent(
      bindHelper.context,
      storageServiceClass
    )

    val boundService = bindHelper.bindForIntent(
      intent,
      scope,
      IStorageServiceNg.Stub::asInterface
    )
    val channel = suspendForOpeningChannel { storageChannelCallback ->
      boundService.service.openStorageChannel(
        storeOptions.toParcelByteArray(storeOptions.type.toParcelableType()),
        storageChannelCallback,
        StorageServiceNgProxyCallback(scope, callback)
      )
    }
    return AndroidStorageEndpointNg(channel) { boundService.disconnect() }
  }
}

/**
 * A helper class that wraps a [ProxyCallback] as an [IMessageCallback], running the callbacks on
 * the provided [CoroutineScope].
 */
@OptIn(ExperimentalCoroutinesApi::class)
class StorageServiceNgProxyCallback<Data : CrdtData, Op : CrdtOperation, T>(
  private val scope: CoroutineScope,
  private val callback: ProxyCallback<Data, Op, T>
) : IMessageCallback.Stub() {

  override fun onMessage(message: ByteArray) {
    scope.launch(start = CoroutineStart.UNDISPATCHED) {
      @Suppress("UNCHECKED_CAST")
      callback(
        message.decodeStorageServiceMessageProto().proxyMessage.decode()
          as ProxyMessage<Data, Op, T>
      )
    }
  }
}
