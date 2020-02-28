package arcs.android.host

import arcs.core.host.WritePerson

class TestWritingExternalHostService : TestExternalArcHostService(WritingExternalHost()) {

    class WritingExternalHost : TestingAndroidHost(WritePerson::class)
}
