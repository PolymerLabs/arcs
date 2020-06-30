package arcs.sdk.testing

import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.entity.HandleDataType
import arcs.core.entity.HandleSpec
import arcs.core.host.EntityHandleManager
import arcs.core.host.ParticleContext
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Scheduler
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import arcs.sdk.Handle
import arcs.sdk.Particle
import arcs.sdk.ReadCollectionHandle
import arcs.sdk.ReadSingletonHandle
import arcs.sdk.WriteCollectionHandle
import arcs.sdk.WriteSingletonHandle
import com.google.common.truth.Truth.assertWithMessage
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.withContext
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
 * Test harness should be used as a JUnit rule, e.g.
 * ```
 * @get:Rule val th = YourParticleTestHarness { scope -> YourParticle(scope) }
 *
 * @Test
 * fun works() = runBlockingTest {
 *   // Instantiate and boot the particle.
 *   harness.start()
 *
 *   // Set up initial state, e.g. handles.
 *   harness.store(harness.handleName, YourEntity(...))
 *
 *   // Continue with the test.
 *   assertThat(harness.fetch(harness.otherHandle)).isEqualTo(...)
 * }
 * ```
 *
 * See the example test of the [arcs.sdk.examples.testing.ComputePeopleStats] particle.
 *
 * @property factory lambda instantiating a particle under test
 */
@ExperimentalCoroutinesApi
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
                RamDisk.clear()
                RamDiskDriverProvider()
                DriverAndKeyConfigurator.configureKeyParsers()

                val schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
                scheduler = schedulerProvider(description.methodName)
                val handleManager = EntityHandleManager(
                    arcId = "testHarness",
                    hostId = "testHarnessHost",
                    time = JvmTime,
                    scheduler = scheduler
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
                    statement.evaluate()
                    runBlocking {
                        scheduler.waitForIdle()
                        handleManager.close()
                    }
                } finally {
                    schedulerProvider.cancelAll()
                }
            }
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
        val context = ParticleContext(particle, plan, scheduler)

        particleHandles.forEach { (name, handle) ->
            particle.handles.setHandle(name, handle)
            context.registerHandle(handle)
        }

        // Particle.onFirstStart, Particle.onStart
        context.initParticle()

        // Handle.onReady, Particle.onReady
        val gate = Job()
        context.runParticle { gate.complete() }
        gate.join()

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

    /**
     * Calls [ReadSingletonHandle.fetch] with the handle's dispatcher context.
     */
    suspend fun <H : ReadSingletonHandle<T>, T> fetch(handle: H): T? {
        return withContext(handle.dispatcher) { handle.fetch() }
    }

    /**
     * Calls [WriteSingletonHandle.store] with the handle's dispatcher context and waits for it to
     * complete (including notifications being sent to other handles reading from the same store).
     */
    suspend fun <H : WriteSingletonHandle<T>, T> store(handle: H, element: T) {
        withContext(handle.dispatcher) { handle.store(element) }.join()
        handle.getProxy().waitForIdle()
    }

    /**
     * Calls [WriteSingletonHandle.clear] with the handle's dispatcher context and waits for it to
     * complete (including notifications being sent to other handles reading from the same store).
     */
    suspend fun <H : WriteSingletonHandle<T>, T> clear(handle: H) {
        withContext(handle.dispatcher) { handle.clear() }.join()
        handle.getProxy().waitForIdle()
    }

    /**
     * Calls [ReadCollectionHandle.size] with the handle's dispatcher context.
     */
    suspend fun <H : ReadCollectionHandle<T>, T> size(handle: H): Int {
        return withContext(handle.dispatcher) { handle.size() }
    }

    /**
     * Calls [ReadCollectionHandle.isEmpty] with the handle's dispatcher context.
     */
    suspend fun <H : ReadCollectionHandle<T>, T> isEmpty(handle: H): Boolean {
        return withContext(handle.dispatcher) { handle.isEmpty() }
    }

    /**
     * Calls [ReadCollectionHandle.fetchAll] with the handle's dispatcher context.
     */
    suspend fun <H : ReadCollectionHandle<T>, T> fetchAll(handle: H): Set<T> {
        return withContext(handle.dispatcher) { handle.fetchAll() }
    }

    /**
     * Calls [WriteCollectionHandle.store] with the handle's dispatcher context and waits for it to
     * complete (including notifications being sent to other handles reading from the same store).
     *
     * This allows multiple elements to be stored and will wait until all the operations are done.
     */
    suspend fun <H : WriteCollectionHandle<T>, T> store(handle: H, first: T, vararg rest: T) {
        withContext(handle.dispatcher) {
            listOf(handle.store(first)) + rest.map { handle.store(it) }
        }.joinAll()
        handle.getProxy().waitForIdle()
    }

    /**
     * Calls [WriteCollectionHandle.remove] with the handle's dispatcher context and waits for it to
     * complete (including notifications being sent to other handles reading from the same store).
     *
     * This allows multiple elements to be removed and will wait until all the operations are done.
     */
    suspend fun <H : WriteCollectionHandle<T>, T> remove(handle: H, first: T, vararg rest: T) {
        withContext(handle.dispatcher) {
            listOf(handle.remove(first)) + rest.map { handle.remove(it) }
        }.joinAll()
        handle.getProxy().waitForIdle()
    }

    /**
     * Calls [WriteCollectionHandle.clear] with the handle's dispatcher context and waits for it to
     * complete (including notifications being sent to other handles reading from the same store).
     */
    suspend fun <H : WriteCollectionHandle<T>, T> clear(handle: H) {
        withContext(handle.dispatcher) { handle.clear() }.join()
        handle.getProxy().waitForIdle()
    }
}
