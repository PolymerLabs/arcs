package arcs.sdk.android.storage

import android.content.Context
import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.StoreManager
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
fun AndroidStorageServiceEndpointManager(
    context: Context,
    coroutineContext: CoroutineContext,
    connectionFactory: ConnectionFactory? = null

) = DirectStorageEndpointManager(
    StoreManager(
        ServiceStoreFactory(context, coroutineContext, connectionFactory)
    )
)
