package arcs.android.host

import arcs.core.host.ReadPerson
import arcs.core.host.toRegistration

class TestReadingExternalHostService : TestExternalArcHostService() {
    override val arcHost = object : TestingAndroidHost(
        this@TestReadingExternalHostService,
        ::ReadPerson.toRegistration()
    ) {}
}
