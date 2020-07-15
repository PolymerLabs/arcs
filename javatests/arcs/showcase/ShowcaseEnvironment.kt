@file:Suppress("EXPERIMENTAL_IS_NOT_ENABLED")

package arcs.showcase

import android.app.Application
import androidx.lifecycle.Lifecycle
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
import arcs.core.storage.StoreManager
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.util.TaggedLog
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.Particle
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement

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
    private val log = TaggedLog { "ShowcaseEnvironment" }

    lateinit var allocator: Allocator
    lateinit var arcHost: ShowcaseHost

    private val startedArcs = mutableListOf<Arc>()

    /**
     * Starts an [Arc] for a given [Plan] and waits for it to be ready.
     */
    suspend fun startArc(plan: Plan): Arc {
        log.info { "Starting arc for plan: $plan" }
        val arc = allocator.startArcForPlan(plan)
        startedArcs.add(arc)
        log.info { "Waiting for start of $arc" }
        arc.waitForStart()
        log.info { "Arc started: $arc" }
        return arc
    }

    /**
     * Retrieves a [Particle] instance from a given [Arc].
     */
    suspend inline fun <reified T : Particle> getParticle(plan: Plan): T {
        require(plan.arcId != null) {
            "retrieving a particle for non-singleton plans is not supported"
        }
        val arc = startArc(plan)
        return arcHost.getParticle(arc.id.toString(), T::class.simpleName!!)
    }

    /**
     * Retrieves a [Particle] instance from a given [Arc].
     */
    inline fun <reified T : Particle> getParticle(arc: Arc): T {
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

                // Set up the Database manager, drivers, and keys/key-parsers.
                val dbManager = AndroidSqliteDatabaseManager(context)
                DriverAndKeyConfigurator.configure(dbManager)
                WorkManagerTestInitHelper.initializeTestWorkManager(context)

                // Set up an android lifecycle for our arc host and store managers.
                val lifecycleOwner = object : LifecycleOwner {
                    private val lifecycle = LifecycleRegistry(this)
                    override fun getLifecycle() = lifecycle
                }
                // Initialize it to started.
                lifecycleOwner.lifecycle.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
                lifecycleOwner.lifecycle.handleLifecycleEvent(Lifecycle.Event.ON_START)
                lifecycleOwner.lifecycle.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)

                // Create a single scheduler provider for both the ArcHost as well as the Allocator.
                val schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)

                // Ensure we're using the StorageService (via the TestConnectionFactory)
                val activationFactory = ServiceStoreFactory(
                    context,
                    lifecycleOwner.lifecycle,
                    connectionFactory = TestConnectionFactory(context)
                )

                // Create our ArcHost, capturing the StoreManager so we can manually wait for idle
                // on it once the test is done.
                val arcHostStoreManager = StoreManager(activationFactory)
                arcHost = ShowcaseHost(
                    Dispatchers.Default,
                    schedulerProvider,
                    arcHostStoreManager,
                    activationFactory,
                    *particleRegistrations
                )

                // Create our allocator, and no need to have it support arc serialization for the
                // showcase.
                allocator = Allocator.createNonSerializing(
                    ExplicitHostRegistry().apply {
                        runBlocking { registerHost(arcHost) }
                    }
                )

                try {
                    // Running the test within a try block, so we can clean up in the finally
                    // section, even if the test fails.
                    statement.evaluate()
                } finally {
                    // Shutting down/cleaning-up...
                    runBlocking {
                        // Stop all the arcs and shut down the arcHost.
                        startedArcs.forEach { it.stop() }
                        arcHost.shutdown()

                        // Wait for our stores to become idle.
                        arcHostStoreManager.waitForIdle()

                        // Tell the ServiceStores that they should unbind.
                        withContext(Dispatchers.Main) {
                            lifecycleOwner.lifecycle
                                .handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
                            lifecycleOwner.lifecycle
                                .handleLifecycleEvent(Lifecycle.Event.ON_STOP)
                            lifecycleOwner.lifecycle
                                .handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
                        }

                        // Reset the Databases and close them.
                        dbManager.resetAll()
                        dbManager.close()

                        // Reset the RamDisk.
                        RamDisk.clear()
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
    coroutineContext: CoroutineContext,
    schedulerProvider: SchedulerProvider,
    override val stores: StoreManager,
    override val activationFactory: ActivationFactory,
    vararg particleRegistrations: ParticleRegistration
) : AbstractArcHost(
    coroutineContext,
    schedulerProvider,
    activationFactory,
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

    override fun toString(): String = "ShowcaseHost"
}
