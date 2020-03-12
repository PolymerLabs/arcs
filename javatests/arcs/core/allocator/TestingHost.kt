package arcs.core.allocator

import arcs.core.data.Plan
import arcs.core.host.AbstractArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.util.Time
import arcs.jvm.util.testutil.TimeImpl

open class TestingHost(vararg particles: ParticleRegistration) :
    AbstractArcHost(*particles) {

    fun arcHostContext(arcId: String) = getArcHostContext(arcId)

    var started = mutableListOf<Plan.Partition>()

    override suspend fun startArc(partition: Plan.Partition) {
        super.startArc(partition)
        started.add(partition)
    }

    val isIdle = isArcHostIdle
    
    override val platformTime: Time = TimeImpl()

    fun setup() {
        started.clear()
        clearCache()
    }
}
