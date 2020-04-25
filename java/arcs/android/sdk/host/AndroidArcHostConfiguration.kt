package arcs.android.sdk.host

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.core.host.AbstractArcHost
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlin.coroutines.CoroutineContext

/**
 * Provide an [AbstractArcHost.Configuration] that configures the [AbstractArcHost] for usage
 * on an Android platform, using the Android [StorageService].
 */
fun androidArcHostConfiguration(
    context: Context,
    lifecycle: Lifecycle,
    parentCoroutineContext: CoroutineContext,
    connectionFactory: ConnectionFactory? = null
) = AbstractArcHost.Configuration(
    AndroidHandleManagerProvider(
        context,
        lifecycle,
        parentCoroutineContext,
        connectionFactory
    )
)
