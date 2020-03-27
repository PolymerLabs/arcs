package arcs.core.host

import arcs.core.data.Plan
import arcs.core.host.AbstractArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.util.Time
import arcs.jvm.util.testutil.FakeTime
import kotlinx.coroutines.CompletableDeferred

open class TestingHost(testingResurrector: Resurrector, vararg particles: ParticleRegistration) :
    AbstractArcHost(*particles) {

    override val resurrector = testingResurrector

    fun arcHostContext(arcId: String) = getArcHostContext(arcId)

    var started = mutableListOf<Plan.Partition>()
    var deferred = CompletableDeferred<Boolean>()
    var waitingFor: String? = null

    override suspend fun startArc(partition: Plan.Partition) {
        super.startArc(partition)
        started.add(partition)
        if (partition.arcId == waitingFor) {
            deferred.complete(true)
        }
    }

    val isIdle = isArcHostIdle
    
    override val platformTime: Time = FakeTime()

    fun setup() {
        started.clear()
        clearCache()
    }

    /** Wait for an arc with [arcId] to start. */
    suspend fun waitFor(arcId: String) {
        if (deferred.isCompleted || started.any { it.arcId == arcId }) {
            return
        } else {
            deferred = CompletableDeferred()
        }
        waitingFor = arcId
        deferred.await()
    }
}
