package arcs.sdk.testing

import arcs.core.entity.Entity
import arcs.core.entity.HandleSpec
import arcs.core.host.EntityHandleManager
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Scheduler
import arcs.jvm.util.JvmTime
import arcs.sdk.Handle
import arcs.sdk.Particle
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestCoroutineScope
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
 *
 *   // Set up initial state, e.g. handles.
 *   harness.handleName.store(YourEntity(...))
 *
 *   // Instantiate and boot the particle.
 *   harness.start()
 *
 *   // Continue with the test.
 *   assertThat(harness.otherHandle.fetch()).isEqualTo(...)
 * }
 * ```
 *
 * See the example test of the [arcs.sdk.examples.testing.ComputePeopleStats] particle.
 *
 * @property factory lamda instantiating a particle under test
 */
open class BaseTestHarness<P : Particle>(
    private val factory: (CoroutineScope) -> P,
    private val specs: List<HandleSpec<out Entity>>
) : TestRule {

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    private val scope = TestCoroutineScope()
    private val handles = mutableMapOf<String, Handle>()

    // Exposes handles to subclasses in a read only fashion.
    protected val handleMap: Map<String, Handle>
        get() = handles

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

                scope.launch {
                    val handleManager = EntityHandleManager(
                        arcId = "testHarness",
                        hostId = "testHarnessHost",
                        time = JvmTime,
                        scheduler = Scheduler(JvmTime, scope.coroutineContext)
                    )
                    specs.forEach { spec ->
                        val storageKey = ReferenceModeStorageKey(
                            backingKey = RamDiskStorageKey("backing_${spec.baseName}"),
                            storageKey = RamDiskStorageKey("entity_${spec.baseName}")
                        )
                        handles[spec.baseName] = handleManager.createHandle(spec, storageKey)
                    }
                }
                statement.evaluate()
            }
        }
    }

    /**
     * Creates a particle and plays its boot up sequence.
     *
     * TODO: Describe the boot up sequence in detail once it is finalized.
     */
    suspend fun start() {
        assertWithMessage("Harness can be started only once")
            .that(::particle.isInitialized).isFalse()
        particle = factory(scope)
        handles.forEach { (name, handle) -> particle.handles.setHandle(name, handle) }
        particle.onCreate()
        handles.values.toList().withIndex().forEach { (index, handle) ->
            particle.onHandleSync(handle, index == handles.size - 1)
        }
    }
}
