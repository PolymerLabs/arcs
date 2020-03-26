package arcs.android.host

import arcs.core.host.WritePerson
import arcs.core.host.toRegistration

class TestWritingExternalHostService : TestExternalArcHostService() {
    override val arcHost = object : TestingAndroidHost(
        this@TestWritingExternalHostService,
        resurrector,
        ::WritePerson.toRegistration()
    ) {}
}
