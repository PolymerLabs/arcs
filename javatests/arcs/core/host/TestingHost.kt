package arcs.core.host

import arcs.core.data.Plan
import arcs.core.host.AbstractArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.util.Time
import arcs.jvm.util.testutil.FakeTime

open class TestingHost(testingResurrector: Resurrector, vararg particles: ParticleRegistration) :
    AbstractArcHost(*particles) {

    override val resurrector = testingResurrector

    fun arcHostContext(arcId: String) = getArcHostContext(arcId)

    var started = mutableListOf<Plan.Partition>()

    override suspend fun startArc(partition: Plan.Partition) {
        super.startArc(partition)
        started.add(partition)
    }

    val isIdle = isArcHostIdle
    
    override val platformTime: Time = FakeTime()

    fun setup() {
        started.clear()
        clearCache()
    }
}
