package arcs.core.host

import arcs.core.common.ArcId
import arcs.core.data.Plan
import arcs.core.entity.Storable
import arcs.core.host.api.Particle
import arcs.core.util.Time
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.Handle
import arcs.sdk.HandleHolderBase
import arcs.sdk.ReadWriteCollectionHandle
import arcs.sdk.ReadWriteSingletonHandle
import java.lang.IllegalArgumentException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
open class TestingHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
) : AbstractArcHost(schedulerProvider, *particles) {

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

    override val platformTime: Time = FakeTime()

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

    /** Retrieve a test particle by name. */
    fun <T : Particle> getParticle(arcId: ArcId, particleName: String): T {
        val arcHostContext = requireNotNull(getArcHostContext(arcId.toString()))
        @Suppress("UNCHECKED_CAST")
        return arcHostContext.particles[particleName]!!.particle as T
    }

    /** Create a read/write singleton handle for tests to access an arc's stores. */
    suspend fun <T : Storable> singletonForTest(
        arcId: ArcId,
        particleName: String,
        handleName: String
    ): ReadWriteSingletonHandle<T> {
        @Suppress("UNCHECKED_CAST")
        return createHandleForTest(arcId, particleName, handleName) as ReadWriteSingletonHandle<T>
    }

    /** Create a read/write collection handle for tests to access an arc's stores. */
    suspend fun <T : Storable> collectionForTest(
        arcId: ArcId,
        particleName: String,
        handleName: String
    ): ReadWriteCollectionHandle<T> {
        @Suppress("UNCHECKED_CAST")
        return createHandleForTest(arcId, particleName, handleName) as ReadWriteCollectionHandle<T>
    }

    // TODO: is there a simpler way to do this?
    // Currently requires tests to use the following seemingly redundant call construct:
    //    singletonForTest<MyParticle_Data>(arcId, "MyParticle", "data")
    // Alternatively, consider having an internal mechanism for test access to data stores?
    private suspend fun createHandleForTest(
        arcId: ArcId,
        particleName: String,
        handleName: String
    ): Handle {
        val arcHostContext = requireNotNull(getArcHostContext(arcId.toString()))
        val particleContext = requireNotNull(arcHostContext.particles[particleName])
        val handleConnection = requireNotNull(particleContext.planParticle.handles[handleName])
        val readWriteConnection = handleConnection.copy(mode = HandleMode.ReadWrite)
        val entitySpecs = particleContext.particle.handles.getEntitySpecs(handleName)
        val handleHolder = HandleHolderBase(
            "TestHolder",
            mapOf(handleName to entitySpecs)
        )
        val handle = createHandle(
            arcHostContext.entityHandleManager, handleName, readWriteConnection, handleHolder
        )
        return handle
    }
}
