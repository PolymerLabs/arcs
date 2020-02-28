package arcs.core.allocator

import arcs.core.data.Plan
import arcs.core.host.AbstractArcHost
import arcs.jvm.host.toRegistrationList
import arcs.sdk.Particle
import kotlin.reflect.KClass

open class TestingHost(vararg particles: KClass<out Particle>) :
    AbstractArcHost(*particles.toRegistrationList()) {

    fun arcHostContext(arcId: String) = getArcHostContext(arcId)

    var started = mutableListOf<Plan.Partition>()

    override suspend fun startArc(partition: Plan.Partition) {
        super.startArc(partition)
        started.add(partition)
    }

    fun setup() {
        started.clear()
    }
}
