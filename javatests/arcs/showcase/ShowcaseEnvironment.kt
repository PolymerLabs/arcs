@file:Suppress("EXPERIMENTAL_IS_NOT_ENABLED")

package arcs.showcase

import android.app.Application
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.test.core.app.ApplicationProvider
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.allocator.Allocator
import arcs.core.allocator.Arc
import arcs.core.data.Plan
import arcs.core.host.AbstractArcHost
import arcs.core.host.ArcHost
import arcs.core.host.EntityHandleManager
import arcs.core.host.ParticleRegistration
import arcs.core.host.ParticleState
import arcs.core.host.SchedulerProvider
import arcs.core.storage.ActivationFactory
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.Particle
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement
import kotlin.coroutines.EmptyCoroutineContext

/**
 * A JUnit rule setting up an Arcs environment for showcasing features.
 *
 * Usage example follows:
 *
 * ```
 * @get:Rule val env = ShowcaseEnvironment(
 *     ::SomeParticle.toRegistration(),
 *     ::OtherParticle.toRegistration(),
 * )
 *
 * @Test
 * fun answerToEverythingIsCorrect() = runTest {
 *   // Start an Arc.
 *   val arc = env.startArc(YourGeneratedPlan)
 *
 *   // Do something with it.
 *   env.getParticle<SomeParticle>(arc).query("what's the answer?")
 *
 *   // Assert result.
 *   assertThat(env.getParticle<OtherParticle>(arc).state).isEqualTo(42)
 * }
 * ```
 */
@ExperimentalCoroutinesApi
class ShowcaseEnvironment(
    vararg val particleRegistrations: ParticleRegistration
) : TestRule {

    lateinit var allocator: Allocator
    lateinit var arcHost: ShowcaseHost

    private val startedArcs = mutableListOf<Arc>()

    /**
     * Starts an [Arc] for a given [Plan] and waits for it to be ready.
     */
    suspend fun startArc(plan: Plan): Arc {
        val arc = allocator.startArcForPlan(plan)
        startedArcs.add(arc)
        arc.waitForStart()
        return arc
    }

    /**
     * Retrieves a [Particle] instance from a given [Arc].
     */
    suspend inline fun <reified T: Particle> getParticle(plan: Plan) : T {
        require(plan.arcId != null) {
            "retrieving a particle for non-singleton plans is not supported"
        }
        val arc = startArc(plan)
        return arcHost.getParticle(arc.id.toString(), T::class.simpleName!!)
    }

    /**
     * Retrieves a [Particle] instance from a given [Arc].
     */
    inline fun <reified T: Particle> getParticle(arc: Arc) : T {
        return arcHost.getParticle(arc.id.toString(), T::class.simpleName!!)
    }

    /**
     * Stops a given [Arc].
     */
    suspend fun stopArc(arc: Arc) = allocator.stopArc(arc.id)

    override fun apply(statement: Statement, description: Description): Statement {
        return object : Statement() {
            override fun evaluate() {
                // Initializing the environment...
                val context = ApplicationProvider.getApplicationContext<Application>()
                val dbManager = AndroidSqliteDatabaseManager(context)
                DriverAndKeyConfigurator.configure(dbManager)
                WorkManagerTestInitHelper.initializeTestWorkManager(context)
                val schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)

                arcHost = ShowcaseHost(
                    schedulerProvider,
                    ServiceStoreFactory(
                        context,
                        object : LifecycleOwner {
                            private val lifecycle = LifecycleRegistry(this)
                            override fun getLifecycle() = lifecycle
                        }.lifecycle,
                        connectionFactory = TestConnectionFactory(context)
                    ),
                    *particleRegistrations
                )

                allocator = Allocator.create(
                    ExplicitHostRegistry().apply {
                        runBlocking {
                            registerHost(arcHost)
                        }
                    },
                    EntityHandleManager(
                        arcId = "allocator",
                        hostId = "allocator",
                        time = JvmTime,
                        scheduler = schedulerProvider.invoke("allocator")
                    )
                )

                // Running the test...
                statement.evaluate()

                // Shutting down...
                runBlocking {
                    startedArcs.forEach { stopArc(it) }

                    // Attempt a resetAll().
                    // Rarely, this fails with "attempt to re-open an already-closed object"
                    // Ignoring this exception should be OK.
                    try {
                        dbManager.resetAll()
                    } catch (e: Exception) {
                        println("Ignoring dbManager.resetAll() exception: $e")
                    }
                }
            }
        }
    }
}

/**
 * An [ArcHost] exposing the ability to get instances of particles.
 */
@ExperimentalCoroutinesApi
class ShowcaseHost(
    schedulerProvider: SchedulerProvider,
    override val activationFactory: ActivationFactory,
    vararg particleRegistrations: ParticleRegistration
) : AbstractArcHost(
    schedulerProvider,
    *particleRegistrations
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

