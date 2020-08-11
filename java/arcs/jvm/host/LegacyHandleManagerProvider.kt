package arcs.jvm.host

import arcs.core.analytics.Analytics
import arcs.core.common.Id
import arcs.core.host.EntityHandleManager
import arcs.core.host.HandleManager
import arcs.core.host.HandleManagerProvider
import arcs.core.host.SchedulerProvider
import arcs.core.storage.StoreManager
import arcs.core.util.Time
import arcs.jvm.util.JvmTime

/**
 * An implementation of [HandleManagerProvider] that uses the old [StoreManager].
 *
 * This will eventually be removed, in favor of direct implementations of handle manager providers
 * for direct-JVM and Android storage service use cases.
 */
open class LegacyHandleManagerProvider(
    private val stores: StoreManager,
    private val schedulerProvider: SchedulerProvider,
    private val time: Time = JvmTime,
    private val analytics: Analytics? = null
) : HandleManagerProvider {
    override fun create(arcId: String, hostId: String): HandleManager {
        return EntityHandleManager(
            arcId,
            hostId,
            time,
            schedulerProvider(arcId),
            stores,
            Id.Generator.newSession(),
            analytics
        )
    }
}
