package arcs.android.host

import arcs.core.host.ReadPerson

class TestReadingExternalHostService : TestExternalArcHostService(ReadingExternalHost()) {

    class ReadingExternalHost : TestingAndroidHost(ReadPerson::class)
}
