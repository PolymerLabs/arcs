package arcs.android.host

import arcs.core.data.Plan
import arcs.core.host.ReadPerson

class TestReadingExternalHostService : TestExternalArcHostService(ReadingExternalHost()) {

    class ReadingExternalHost : TestingAndroidHost(ReadPerson::class) {
        override suspend fun startArc(partition: Plan.Partition) {
            super.startArc(partition)
        }

        override suspend fun stopArc(partition: Plan.Partition) {
            super.stopArc(partition)
        }
    }
}
