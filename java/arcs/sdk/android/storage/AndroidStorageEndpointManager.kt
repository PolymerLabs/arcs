package arcs.sdk.android.storage

import android.content.Context
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageEndpoint
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StorageEndpointProvider
import arcs.core.storage.StoreOptions
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
class AndroidStorageEndpointManager(
    context: Context,
    coroutineContext: CoroutineContext,
    connectionFactory: ConnectionFactory? = null
) : StorageEndpointManager {
    val factory = ServiceStoreFactory(
        context,
        coroutineContext,
        connectionFactory
    )
    override suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
        storeOptions: StoreOptions
    ): StorageEndpointProvider<Data, Op, T> {
        val serviceStore: ServiceStore<Data, Op, T> = factory.invoke(storeOptions)
        return ServiceStorageEndpointProvider(
            serviceStore)
    }

    override fun close() {}
}

@ExperimentalCoroutinesApi
class ServiceStorageEndpointProvider<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    private val serviceStore: ServiceStore<Data, Op, T>
) : StorageEndpointProvider<Data, Op, T> {
    override val storageKey = serviceStore.storageKey

    override fun create(callback: ProxyCallback<Data, Op, T>): StorageEndpoint<Data, Op, T> {
        return ServiceStorageEndpoint<Data, Op, T>(
            serviceStore,
            callback
        )
    }
}

@ExperimentalCoroutinesApi
class ServiceStorageEndpoint<Data : CrdtData, Op : CrdtOperationAtTime, T>(
    private val serviceStore: ServiceStore<Data, Op, T>,
    callback: ProxyCallback<Data, Op, T>
) : StorageEndpoint<Data, Op, T> {
    val id = serviceStore.on(callback)
    override suspend fun idle() = serviceStore.idle()

    override fun close() = serviceStore.off(id)

    override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, T>) =
        serviceStore.onProxyMessage(message.withId(id))
}
