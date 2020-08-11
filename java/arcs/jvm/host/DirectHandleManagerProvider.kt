package arcs.jvm.host

import arcs.core.analytics.Analytics
import arcs.core.host.SchedulerProvider
import arcs.core.storage.StoreManager
import arcs.core.util.Time
import arcs.jvm.util.JvmTime

class DirectHandleManagerProvider(
    schedulerProvider: SchedulerProvider,
    time: Time = JvmTime,
    analytics: Analytics? = null
) : LegacyHandleManagerProvider(
    stores = StoreManager(),
    schedulerProvider = schedulerProvider,
    time = time,
    analytics = analytics
)
