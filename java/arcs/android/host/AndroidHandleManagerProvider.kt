package arcs.android.host

import android.content.Context
import arcs.core.analytics.Analytics
import arcs.core.host.SchedulerProvider
import arcs.core.storage.StoreManager
import arcs.jvm.host.LegacyHandleManagerProvider
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * An implementation of [HandleManagerProvider] that uses a [LegacyHandleManagerProvider] base to
 * provide [HandleManager] instances where the handles are backed by Android Storage Services.
 *
 * This will eventually be replaced with a direct implementation that uses the newer
 * [StorageEndpointManager] concept.
 */
@ExperimentalCoroutinesApi
class AndroidHandleManagerProvider(
    context: Context,
    serviceCoroutineContext: CoroutineContext,
    connectionFactory: ConnectionFactory? = null,
    schedulerProvider: SchedulerProvider,
    analytics: Analytics? = null
) : LegacyHandleManagerProvider(
    stores = StoreManager(
        activationFactory = ServiceStoreFactory(
            context = context,
            coroutineContext = serviceCoroutineContext,
            connectionFactory = connectionFactory
        )
    ),
    schedulerProvider = schedulerProvider,
    analytics = analytics
)
