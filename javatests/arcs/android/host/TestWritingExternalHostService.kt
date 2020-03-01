package arcs.android.host

import arcs.core.host.WritePerson
import arcs.core.host.toRegistration

class TestWritingExternalHostService : TestExternalArcHostService(WritingExternalHost()) {

    class WritingExternalHost : TestingAndroidHost(::WritePerson.toRegistration())
}
