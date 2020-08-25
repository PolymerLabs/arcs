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
        storeOptions: StoreOptions
    ): StorageEndpointProvider<Data, Op, T> {
        val store = stores.get<Data, Op, T>(storeOptions)
        return DirectStorageEndpointProvider(store)
    }

    override suspend fun reset() {
        stores.reset()
    }
}

/** A [StorageEndpointProvider] that provides endpoints directly wrapping an [ActiveStore]. */
class DirectStorageEndpointProvider<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    private val store: ActiveStore<Data, Op, T>
) : StorageEndpointProvider<Data, Op, T> {
    override val storageKey = store.storageKey

    override fun create(callback: ProxyCallback<Data, Op, T>) =
        DirectStorageEndpoint(store, callback)
}

/** A [StorageEndpoint] that directly wraps an [ActiveStore]. */
class DirectStorageEndpoint<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    private val store: ActiveStore<Data, Op, T>,
    callback: ProxyCallback<Data, Op, T>
) : StorageEndpoint<Data, Op, T> {
    private val id = store.on(callback)
    override suspend fun idle() = store.idle()

    override suspend fun onProxyMessage(
        message: ProxyMessage<Data, Op, T>
    ) = store.onProxyMessage(message.withId(id))

    override fun close() = store.off(id)
}
