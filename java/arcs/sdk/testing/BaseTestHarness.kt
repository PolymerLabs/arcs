package arcs.sdk.testing

import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.HandleDataType
import arcs.core.entity.HandleSpec
import arcs.core.host.HandleManagerImpl
import arcs.core.host.ParticleContext
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.util.Scheduler
import arcs.jvm.util.JvmTime
import arcs.sdk.Handle
import arcs.sdk.Particle
import com.google.common.truth.Truth.assertWithMessage
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.withTimeout
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement

/**
 * A base class for code generated test harnesses for Kotlin particles.
 *
 * Subclasses of [BaseTestHarness] are code generated with the `arcs_kt_schema` bazel rule.
 * Each subclass gives read and write access to all handles of the particle under test via public
 * properties. This allows interaction with particle under test and asserting on its output. To use
 * the generated test harness depend on the `arcs_kt_schema` target with a `_test_harness` suffix
 * added to the target name.
 *
 * Handle methods should be invoked using the dispatch helpers in arcs.core.testutil.handles
 *
 * Test harness can be used as a JUnit rule established for an entire file, e.g.
 * ```
 * @get:Rule val harness = YourParticleTestHarness { YourParticle() }
 *
 * @Test
 * fun works() = runTest {
 *   // Instantiate and boot the particle.
 *   harness.start()
 *
 *   // Set up initial state, e.g. handles.
 *   harness.handleName.dispatchStore(YourEntity(...))
 *
 *   // Continue with the test.
 *   assertThat(harness.otherHandle.dispatchFetch()).isEqualTo(...)
 * }
 * ```
 *
 * See the example test of the [arcs.sdk.examples.testing.ComputePeopleStats] particle.
 *
 * Or limited to a single test case, e.g.
 * ```
 * @Test
 * fun works() = runHarnessTest(
 *   YourParticleTestHarness { YourParticle() }
 * ) { harness ->
 *   // Instantiate and boot the particle.
 *   harness.start()
 *
 *   // Set up initial state, e.g. handles.
 *   harness.handleName.dispatchStore(YourEntity(...))
 *
 *   // Continue with the test.
 *   assertThat(harness.otherHandle.dispatchFetch()).isEqualTo(...)
 * }
 * ```
 *
 * @property factory lambda instantiating a particle under test
 */
@OptIn(ExperimentalCoroutinesApi::class)
open class BaseTestHarness<P : Particle>(
  private val factory: (CoroutineScope) -> P,
  private val specs: List<HandleSpec>
) : TestRule {

  private val scope = TestCoroutineScope()

  // Particle handles are set up with the read/write mode specified by the manifest.
  private val particleHandles = mutableMapOf<String, Handle>()

  // The harness has a second set of handles mapping to the same storage keys but
  // with full read/write access to allow full inspection from unit tests.
  private val harnessHandles = mutableMapOf<String, Handle>()

  // Exposes handles to subclasses in a read only fashion.
  protected val handleMap: Map<String, Handle>
    get() = harnessHandles

  private lateinit var scheduler: Scheduler

  /**
   * Particle under test. Available after [start] has been called.
   */
  lateinit var particle: P

  override fun apply(statement: Statement, description: Description): Statement {
    return object : Statement() {
      override fun evaluate() {
        withSetupAndCleanup {
          statement.evaluate()
        }
      }
    }
  }

  fun withSetupAndCleanup(run: () -> Unit) {
    runBlocking {
      RamDisk.clear()
    }
    DriverAndKeyConfigurator.configure(null)

    val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
    scheduler = schedulerProvider("testArc_${this.javaClass.simpleName}")
    val handleManager = HandleManagerImpl(
      arcId = "testHarness",
      hostId = "testHarnessHost",
      time = JvmTime,
      scheduler = scheduler,
      storageEndpointManager = testStorageEndpointManager(),
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    )
    try {
      runBlocking {
        specs.forEach { spec ->
          val storageKey = when (spec.dataType) {
            HandleDataType.Entity -> ReferenceModeStorageKey(
              backingKey = RamDiskStorageKey("backing_${spec.baseName}"),
              storageKey = RamDiskStorageKey("entity_${spec.baseName}")
            )
            HandleDataType.Reference ->
              RamDiskStorageKey("ref_${spec.baseName}")
          }
          // Particle handle: use the manifest-specified read/write access.
          particleHandles[spec.baseName] = handleManager.createHandle(
            spec,
            storageKey,
            immediateSync = false
          )
          // Harness (test) handle: allow full read/write access.
          harnessHandles[spec.baseName] = handleManager.createHandle(
            spec.copy(mode = HandleMode.ReadWrite),
            storageKey,
            immediateSync = false
          )
        }
      }
      run()
      runBlocking {
        scheduler.waitForIdle()
      }
    } finally {
      runBlocking {
        handleManager.close()
      }
      schedulerProvider.cancelAll()
    }
  }

  /**
   * Creates a particle and plays its boot up sequence:
   *   1. [Particle.onFirstStart]
   *   2. [Particle.onStart]
   *   3. [Handle.onReady] for all readable handles
   *   4. [Particle.onReady]
   *
   * This will return when the particle reaches the Running state.
   */
  suspend fun start() = coroutineScope {
    assertWithMessage("Harness can be started only once")
      .that(::particle.isInitialized).isFalse()
    particle = factory(scope)
    val plan = Plan.Particle("TestParticle", "", mapOf())
    val context = ParticleContext(particle, plan)

    particleHandles.forEach { (name, handle) ->
      particle.handles.setHandle(name, handle)
      context.registerHandle(handle)
    }

    // Particle.onFirstStart, Particle.onStart
    context.initParticle(scheduler)

    // Handle.onReady, Particle.onReady
    context.runParticleAsync(scheduler).await()

    // Write-only particle handles don't sync their proxies and their harness handle
    // counterparts don't participate in the normal lifecycle process, so harness handle
    // read ops will currently fail. Using immediateSync=true when creating the harness
    // handles would interfere with the lifecycle logic (because they connect to the same
    // proxies as the particle handles), so instead directly sync the harness handles now,
    // after the particle has reached its running state.
    particleHandles.values.filter { !it.mode.canRead }.forEach {
      it.getProxy().maybeInitiateSync()
      it.getProxy().awaitOutgoingMessageQueueDrain()
    }
  }
}

@OptIn(ExperimentalCoroutinesApi::class)
fun <T : BaseTestHarness<*>> runHarnessTest(
  harness: T,
  timeoutMillis: Long = 5000,
  block: suspend CoroutineScope.(harness: T) -> Unit
) = harness.withSetupAndCleanup {
  runBlocking(EmptyCoroutineContext) {
    withTimeout(timeoutMillis) {
      this.block(harness)
    }
  }
}
