package arcs.core.host

import arcs.core.data.Plan
import kotlinx.coroutines.CompletableDeferred
import java.lang.IllegalArgumentException

interface TestingProdHost : ArcHost, ProdHost

open class TestingHost(
    handleManagerProvider: HandleManagerProvider,
    vararg particles: ParticleRegistration
) : AbstractArcHost(handleManagerProvider, *particles) {

    fun arcHostContext(arcId: String) = getArcHostContext(arcId)

    var started = mutableListOf<Plan.Partition>()
    var deferred = CompletableDeferred<Boolean>()
    var waitingFor: String? = null

    var throws = false

    override suspend fun startArc(partition: Plan.Partition) {
        if (throws) {
            throw IllegalArgumentException("Boom!")
        }
        super.startArc(partition)
        started.add(partition)
        if (partition.arcId == waitingFor) {
            deferred.complete(true)
        }
    }

    val isIdle = isArcHostIdle
    
    fun setup() {
        started.clear()
        clearCache()
        throws = false
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
