@file:Suppress("EXPERIMENTAL_IS_NOT_ENABLED")

package arcs.showcase.references

import android.content.Context
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import arcs.core.allocator.Allocator
import arcs.core.allocator.Arc
import arcs.core.common.ArcId
import arcs.core.common.toArcId
import arcs.core.data.Plan
import arcs.core.host.AbstractArcHost
import arcs.core.host.EntityHandleManager
import arcs.core.host.ParticleState
import arcs.core.host.toRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.storage.ActivationFactory
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.Particle
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlin.coroutines.EmptyCoroutineContext

/** Container for WriteRecipe specific things */
@ExperimentalCoroutinesApi
class ArcsStorage(private val arcs: Arcs) {

    // This is a helper for public methods to dispatcher the suspend calls onto a coroutine and
    // wait for the result, and to wrap the suspend methods in a timeout, converting a potential
    // test timeout into a more specific test failure.
    private inline fun <T> run(crossinline block: suspend () -> T) = runBlocking {
        withTimeout(15000) {
            block()
        }
    }

    fun all0(): List<MyLevel0> = run {
        arcs.getParticle<Reader0>(WriteRecipePlan).read()
    }

    fun put0(item: MyLevel0) = run {
        arcs.getParticle<Writer0>(WriteRecipePlan).write(item)
    }

    fun all1(): List<MyLevel1> = run {
        arcs.getParticle<Reader1>(WriteRecipePlan).read()
    }

    fun put1(item: MyLevel1) = run {
        arcs.getParticle<Writer1>(WriteRecipePlan).write(item)
    }

    fun all2(): List<MyLevel2> = run {
        arcs.getParticle<Reader2>(WriteRecipePlan).read()
    }

    fun put2(item: MyLevel2) = run {
        arcs.getParticle<Writer2>(WriteRecipePlan).write(item)
    }

    fun stop() = run {
        arcs.stopArcForPlan(WriteRecipePlan)
    }
}

/** Container to own the allocator and start the long-running arc. */
@ExperimentalCoroutinesApi
class Arcs(
    private val context: Context,
    // A test [ConnectionFactory] can be provided here under test.
    // In production, leave this parameter as null. Arcs will provide a default implementation.
    connectionFactory: ConnectionFactory? = null
) {
    val schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)

    private val fakeLifecycleOwner = object : LifecycleOwner {
        private val lifecycle = LifecycleRegistry(this)
        override fun getLifecycle() = lifecycle
    }

    val activationFactory = ServiceStoreFactory(
        context,
        fakeLifecycleOwner.lifecycle,
        connectionFactory = connectionFactory
    )

    val arcHost = ArcHost(
        schedulerProvider,
        activationFactory = activationFactory
    )

    val hostRegistry = ExplicitHostRegistry().apply {
        runBlocking {
            registerHost(arcHost)
        }
    }

    val allocator = Allocator.create(
        hostRegistry,
        EntityHandleManager(
            arcId = "allocator",
            hostId = "allocator",
            time = JvmTime,
            scheduler = schedulerProvider.invoke("allocator")
        )
    )

    suspend fun <T : Particle> getParticle(
        plan: Plan,
        particleName: String
    ): T {
        val arc = startArc(plan)
        return getParticle(arc.id, particleName)
    }

    suspend fun startArc(plan: Plan): Arc {
        val arc = allocator.startArcForPlan(plan)
        arc.waitForStart()
        return arc
    }

    suspend fun stopArcForPlan(plan: Plan) {
        allocator.stopArc(plan.arcId!!.toArcId())
    }

    suspend inline fun <reified T: Particle> getParticle(plan: Plan) = getParticle<T>(plan, T::class.simpleName!!)

    fun <T : Particle> getParticle(arcId: ArcId, particleName: String): T {
        return arcHost.getParticle(arcId.toString(), particleName)
    }


}

/**
 * An [ArcHost] that exposes the ability to get instances of particles.
 */
@ExperimentalCoroutinesApi
class ArcHost(
    schedulerProvider: SchedulerProvider,
    override val activationFactory: ActivationFactory?
) : AbstractArcHost(
    schedulerProvider,
    ::Reader0.toRegistration(),
    ::Writer0.toRegistration(),
    ::Reader1.toRegistration(),
    ::Writer1.toRegistration(),
    ::Reader2.toRegistration(),
    ::Writer2.toRegistration()
) {
    override val platformTime = JvmTime

    @Suppress("UNCHECKED_CAST")
    fun <T> getParticle(arcId: String, particleName: String): T {
        val arcHostContext = requireNotNull(getArcHostContext(arcId)) {
            "ArcHost: No arc host context found for $arcId"
        }
        val particleContext = requireNotNull(arcHostContext.particles[particleName]) {
            "ArcHost: No particle named $particleName found in $arcId"
        }
        val allowableStartStates = arrayOf(ParticleState.Running, ParticleState.Waiting)
        check(particleContext.particleState in allowableStartStates) {
            "ArcHost: Particle $particleName has failed, or not been started"
        }

        @Suppress("UNCHECKED_CAST")
        return particleContext.particle as T
    }
}

