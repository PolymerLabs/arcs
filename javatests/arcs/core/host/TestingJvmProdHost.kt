package arcs.core.host

import arcs.core.data.Plan
import arcs.core.util.Time
import arcs.jvm.host.JvmProdHost
import arcs.jvm.util.testutil.TimeImpl

open class TestingJvmProdHost(vararg particles: ParticleRegistration) :
    JvmProdHost(TestingJvmProdHost::class, *particles) {

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
