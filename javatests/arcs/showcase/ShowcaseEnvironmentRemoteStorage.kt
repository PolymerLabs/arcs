@file:Suppress("EXPERIMENTAL_IS_NOT_ENABLED")

package arcs.showcase

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.allocator.Allocator
import arcs.core.allocator.Arc
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.data.Plan
import arcs.core.host.AbstractArcHost
import arcs.core.host.ArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.ParticleState
import arcs.core.host.SchedulerProvider
import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StoreManager
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.util.TaggedLog
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.Particle
import arcs.sdk.android.storage.RemoteStorageEndpointManager
import arcs.sdk.android.storage.RemoteStorageEndpointManagerServer
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.BroadcastChannel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
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
class ShowcaseEnvironmentRemoteStorage(
  private val lifecycleTimeoutMillis: Long = 60000,
  vararg val particleRegistrations: ParticleRegistration
) : TestRule {
  private val log = TaggedLog { "ShowcaseEnvironment" }

  lateinit var allocator: Allocator
  lateinit var arcHost: ShowcaseHost

  private val startedArcs = mutableListOf<Arc>()

  constructor(vararg particleRegistrations: ParticleRegistration) :
    this(60000, *particleRegistrations)

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
  suspend inline fun <reified T : Particle> getParticle(arc: Arc): T {
    return arcHost.getParticle(arc.id.toString(), T::class.simpleName!!)
  }

  /**
   * Stops a given [Arc].
   */
  suspend fun stopArc(arc: Arc) = allocator.stopArc(arc.id)

  override fun apply(statement: Statement, description: Description): Statement {
    val suspendingStatement = object : SuspendingStatement {
      override suspend fun evaluate() {
        val components = startupArcs()
        try {
          // Running the test within a try block, so we can clean up in the finally
          // section, even if the test fails.
          statement.evaluate()
        } finally {
          teardownArcs(components)
        }
      }
    }

    return TimeLimitedStatement(suspendingStatement, description, lifecycleTimeoutMillis)
  }

  private interface SuspendingStatement {
    suspend fun evaluate()
  }

  private class TimeLimitedStatement(
    private val innerStatement: SuspendingStatement,
    @Suppress("unused") private val description: Description,
    private val timeoutMillis: Long
  ) : Statement() {
    override fun evaluate() = runBlocking {
      withTimeout(timeoutMillis) { innerStatement.evaluate() }
    }
  }

  private suspend fun startupArcs(): ShowcaseArcsComponents {
    // Reset the RamDisk.
    RamDisk.clear()

    // Initializing the environment...
    val context = ApplicationProvider.getApplicationContext<Application>()
    WorkManagerTestInitHelper.initializeTestWorkManager(context)

    // Set up the Database manager, drivers, and keys/key-parsers.
    val dbManager = AndroidSqliteDatabaseManager(context).also {
      // Be sure we always start with a fresh, empty database.
      it.resetAll()
    }

    DriverAndKeyConfigurator.configure(dbManager)

    // Create a child job so we can cancel it to shut down the endpoint manager,
    // without breaking the test.
    val job = Job(coroutineContext[Job.Key])
    val scope = CoroutineScope(coroutineContext + job)

    val schedulerProvider = JvmSchedulerProvider(Dispatchers.Default)

    // Create our ArcHost, capturing the StoreManager so we can manually wait for idle
    // on it once the test is done.
    val actualStorageEndpointManager = DirectStorageEndpointManager(
      StoreManager(scope) { protocol ->
        StoreWriteBack(
          protocol,
          Channel.UNLIMITED,
          forceEnable = true,
          scope = scope
        )
      }
    )
    val sendChannel = Channel<ByteArray>(1000)
    val recvChannel = BroadcastChannel<ByteArray>(1000)

    val storageEndpointManager = RemoteStorageEndpointManager(
      sendChannel,
      recvChannel,
      scope
    )

    val remoteStorageServer = RemoteStorageEndpointManagerServer<CrdtData, CrdtOperationAtTime, Any?>(
      sendChannel,
      recvChannel,
      actualStorageEndpointManager,
      scope
    )

    remoteStorageServer.start()

    arcHost = ShowcaseHost(
      Dispatchers.Default,
      schedulerProvider,
      storageEndpointManager,
      *particleRegistrations
    )

    // Create our allocator, and no need to have it support arc serialization for the
    // showcase.
    allocator = Allocator.createNonSerializing(
      ExplicitHostRegistry().apply {
        registerHost(arcHost)
      }
    )

    return ShowcaseArcsComponents(scope, dbManager, storageEndpointManager, arcHost)
  }

  private suspend fun teardownArcs(components: ShowcaseArcsComponents) {
    // Stop all the arcs and shut down the arcHost.
    startedArcs.forEach { it.stop() }
    components.arcHost.shutdown()

    // Reset the Databases and close them.
    components.dbManager.resetAll()
    components.dbManager.close()
    components.scope.cancel()
  }

  private data class ShowcaseArcsComponents(
    val scope: CoroutineScope,
    val dbManager: AndroidSqliteDatabaseManager,
    val arcStorageEndpointManager: StorageEndpointManager,
    val arcHost: ArcHost
  )
}
