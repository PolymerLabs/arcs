package arcs.jvm.host

import arcs.core.host.AbstractArcHost
import kotlin.coroutines.CoroutineContext

/**
 * Provide an [AbstractArcHost.Configuration] that is suitable for use on a generic JVM-based
 * target platform. Storage will be provided by default [ActiveStore] instances managed in the
 * same process as the [AbstractArcHost].
 */
fun jvmArcHostConfiguration(
    parentCoroutineContext: CoroutineContext
) = AbstractArcHost.Configuration(
    JvmHandleManagerProvider(
        storeManagerProvider = { AbstractArcHost.singletonStores },
        parentCoroutineContext = parentCoroutineContext
    )
)
