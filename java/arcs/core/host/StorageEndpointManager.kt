package arcs.core.host

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageEndpoint
import arcs.core.storage.StorageEndpointProvider
import arcs.core.storage.StoreManager
import arcs.core.storage.StoreOptions

/**
 * A [StorageEndpointManager] gives us [StorageEndpointProvider]s of particular types.
 */
interface StorageEndpointManager {
    /**
     * Returns a [StorageEndpointProvider] for the requested [StoreOptions], of the specified
     * type parameters.
     *
     * Implementations *may* choose to cache [StorageEndpointProvider] instances internally, so a
     * call to get for the same parameters may or may not return the same object, depending on the
     * implementation.
     */
    suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
        storeOptions: StoreOptions
    ): StorageEndpointProvider<Data, Op, T>
}

/**
 * This is a temporary facade that adapts the provided [StoreManager] to be a
 * [StorageEndpointProvider], with the goal of reducing the scope of change in a single PR.
 *
 * Eventually, we will remove this in favor of a [StorageEndpointProvider] passed directly to
 * [EntityHandleManager].
 */
fun StoreManager.asStoreEndpointManager() = object :
    StorageEndpointManager {
    override suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, ConsumerData> get(
        storeOptions: StoreOptions
    ): StorageEndpointProvider<Data, Op, ConsumerData> {
        val store = this@asStoreEndpointManager.get<Data, Op, ConsumerData>(storeOptions)

        return object :
            StorageEndpointProvider<Data, Op, ConsumerData> {
            override val storageKey = storeOptions.storageKey
            override fun create(
                callback: ProxyCallback<Data, Op, ConsumerData>
            ) = object :
                StorageEndpoint<Data, Op, ConsumerData> {
                private val id = store.on(callback)
                override suspend fun idle() = store.idle()

                override suspend fun onProxyMessage(
                    message: ProxyMessage<Data, Op, ConsumerData>
                ) = store.onProxyMessage(message.withId(id))

                override fun close() = store.off(id)
            }
        }
    }
}
