package arcs.android.host

import arcs.core.data.Plan
import arcs.core.host.WritePerson

class TestWritingExternalHostService : TestExternalArcHostService(WritingExternalHost()) {

    class WritingExternalHost : TestingAndroidHost(WritePerson::class) {
        override suspend fun startArc(partition: Plan.Partition) {
            super.startArc(partition)
        }

        override suspend fun stopArc(partition: Plan.Partition) {
            super.stopArc(partition)
        }
    }
}
