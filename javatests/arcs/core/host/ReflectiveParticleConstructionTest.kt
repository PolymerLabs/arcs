package arcs.core.host

import arcs.core.allocator.Allocator
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.util.TaggedLog
import arcs.core.util.testutil.LogRule
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.util.JvmTime
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ReflectiveParticleConstructionTest {
  @get:Rule
  val log = LogRule()

  private val testScope = TestCoroutineScope()

  class JvmProdHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ) : AbstractArcHost(
    coroutineContext = Dispatchers.Default,
    updateArcHostContextCoroutineContext = Dispatchers.Default,
    schedulerProvider = schedulerProvider,
    storageEndpointManager = testStorageEndpointManager(),
    serializationEnabled = true,
    initialParticles = particles
  ),
    ProdHost {
    override val platformTime = JvmTime
  }

  class AssertingReflectiveParticle(spec: Plan.Particle?) : TestReflectiveParticle(spec) {
    private val log = TaggedLog { "AssertingReflectiveParticle" }

    override fun onStart() {
      log.info { "onStart()" }
      handles.data
      assertThat(schema.name?.name).isEqualTo("Thing")
      assertThat(schema.fields.singletons).containsExactly("name", FieldType.Text)
      assertThat(schema.fields.collections).isEmpty()
      started.complete()
    }

    companion object {
      val started = Job()
    }
  }

  @Test
  fun host_canCreateReflectiveParticle() = runBlocking {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)

    val hostRegistry = ExplicitHostRegistry()
    val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)

    val fakeRegistration = Pair(
      TestReflectiveParticle::class.toParticleIdentifier(),
      ::AssertingReflectiveParticle.toRegistration().second
    )

    hostRegistry.registerHost(JvmProdHost(schedulerProvider, fakeRegistration))

    val allocator = Allocator.create(
      hostRegistry,
      HandleManagerImpl(
        time = FakeTime(),
        scheduler = schedulerProvider("allocator"),
        storageEndpointManager = testStorageEndpointManager(),
        foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
      ),
      testScope
    )

    val arcId = allocator.startArcForPlan(TestReflectiveRecipePlan).waitForStart().id
    // Ensure that it's at least started up.
    withTimeout(1500) { AssertingReflectiveParticle.started.join() }
    allocator.stopArc(arcId)
  }
}
