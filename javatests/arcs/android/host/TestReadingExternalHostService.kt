package arcs.android.host

import arcs.core.host.ReadPerson
import arcs.core.host.toRegistration
import arcs.jvm.host.JvmSchedulerProvider
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
class TestReadingExternalHostService : TestExternalArcHostService() {
    override val arcHost = object : TestingAndroidHost(
        this@TestReadingExternalHostService,
        JvmSchedulerProvider(scope.coroutineContext),
        ::ReadPerson.toRegistration()
    ) {}
}
