package arcs.android.host

import arcs.core.host.ReadPerson
import arcs.core.host.toRegistration

class TestReadingExternalHostService : TestExternalArcHostService(ReadingExternalHost()) {

    class ReadingExternalHost : TestingAndroidHost(::ReadPerson.toRegistration())
}
