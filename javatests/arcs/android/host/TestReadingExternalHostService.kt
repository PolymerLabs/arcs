package arcs.android.host

import arcs.core.host.ReadPerson
import arcs.core.host.toRegistration
import arcs.core.util.Scheduler
import arcs.jvm.util.JvmTime
import kotlinx.coroutines.asCoroutineDispatcher
import java.util.concurrent.Executors

class TestReadingExternalHostService : TestExternalArcHostService() {
    override val arcHost = object : TestingAndroidHost(
        this@TestReadingExternalHostService,
        Scheduler(JvmTime, Executors.newSingleThreadExecutor().asCoroutineDispatcher()),
        ::ReadPerson.toRegistration()
    ) {}
}
