package arcs.android.host

import arcs.core.host.WritePerson
import arcs.core.host.toRegistration
import arcs.jvm.host.JvmSchedulerProvider

class TestWritingExternalHostService : TestExternalArcHostService() {
    override val arcHost = object : TestingAndroidHost(
        this@TestWritingExternalHostService,
        ::WritePerson.toRegistration()
    ) {}
}
