package arcs.android.host

import arcs.core.host.WritePerson
import arcs.core.host.toRegistration
import arcs.core.util.Scheduler
import arcs.jvm.util.JvmTime
import kotlinx.coroutines.asCoroutineDispatcher
import java.util.concurrent.Executors

class TestWritingExternalHostService : TestExternalArcHostService() {
    override val arcHost = object : TestingAndroidHost(
        this@TestWritingExternalHostService,
        Scheduler(JvmTime, Executors.newSingleThreadExecutor().asCoroutineDispatcher()),
        ::WritePerson.toRegistration()
    ) {}
}
