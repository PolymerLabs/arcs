package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime

/**
 * A [StorageEndpointManager] that creates [DirectStorageEndpointProviders] wrapping the stores
 * provided in the [stores] parameter.
 */
class DirectStorageEndpointManager(
  private val stores: StoreManager
) : StorageEndpointManager {
  override suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
    storeOptions: StoreOptions,
    callback: ProxyCallback<Data, Op, T>
  ): StorageEndpoint<Data, Op, T> {
    val store = stores.get<Data, Op, T>(storeOptions)
    val id = store.on(callback)
    return DirectStorageEndpoint(store, id)
  }
}

/** A [StorageEndpoint] that directly wraps an [ActiveStore]. */
class DirectStorageEndpoint<Data : CrdtData, Op : CrdtOperationAtTime, T>(
  private val store: ActiveStore<Data, Op, T>,
  private val id: Int
) : StorageEndpoint<Data, Op, T> {
  override suspend fun idle() = store.idle()

  override suspend fun onProxyMessage(
    message: ProxyMessage<Data, Op, T>
  ) = store.onProxyMessage(message.withId(id))

  override suspend fun close() = store.off(id)
}
