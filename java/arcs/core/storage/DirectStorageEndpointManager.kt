package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime

/**
 * A component that will create [DirectStorageEndpointProvider]s backed by the set of stores in
 * the provided [StoreManager].
 */
class DirectStorageEndpointManager(
    private val stores: StoreManager
) : StorageEndpointManager {
    override suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, ConsumerData> get(
        storeOptions: StoreOptions
    ): StorageEndpointProvider<Data, Op, ConsumerData> {
        val store = stores.get<Data, Op, ConsumerData>(storeOptions)
        return DirectStorageEndpointProvider(store)
    }

    override fun close() {}
}

class DirectStorageEndpointProvider<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    private val store: ActiveStore<Data, Op, T>
) :
    StorageEndpointProvider<Data, Op, T> {
    override val storageKey = store.storageKey
    override fun create(
        callback: ProxyCallback<Data, Op, T>
    ) = DirectStorageEndpoint<Data, Op, T>(store, callback)
}

/** A [StorageEndpoint] implementation that directly wraps an [ActiveStore]. */
class DirectStorageEndpoint<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    val store: ActiveStore<Data, Op, T>,
    callback: ProxyCallback<Data, Op, T>
) : StorageEndpoint<Data, Op, T> {
    private val id = store.on(callback)
    override suspend fun idle() = store.idle()

    override suspend fun onProxyMessage(
        message: ProxyMessage<Data, Op, T>
    ) = store.onProxyMessage(message.withId(id))

    override fun close() = store.off(id)
}
