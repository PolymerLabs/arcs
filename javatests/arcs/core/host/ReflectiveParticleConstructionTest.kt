package arcs.core.host

import arcs.core.allocator.Allocator
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.entity.Handle
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.util.TaggedLog
import arcs.core.util.testutil.LogRule
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmHost
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.coroutines.EmptyCoroutineContext


@RunWith(JUnit4::class)
@ExperimentalCoroutinesApi
class ReflectiveParticleConstructionTest {
    @get:Rule
    val log = LogRule()

    class JvmProdHost(
        schedulerProvider: SchedulerProvider,
        vararg particles: ParticleRegistration
    ) : JvmHost(schedulerProvider, *particles), ProdHost

    class AssertingReflectiveParticle(spec: Plan.Particle?) : TestReflectiveParticle(spec) {
        private val log = TaggedLog { "AssertingReflectiveParticle" }

        override suspend fun onFirstStart() {
            super.onFirstStart()
            log.info { "onFirstStart()" }
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
        RamDiskStorageKey.registerKeyCreator()
        RamDiskDriverProvider()

        VolatileStorageKey.registerKeyCreator()

        val hostRegistry = ExplicitHostRegistry()
        val schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)

        val fakeRegistration = Pair(
            TestReflectiveParticle::class.toParticleIdentifier(),
            ::AssertingReflectiveParticle.toRegistration().second
        )

        hostRegistry.registerHost(JvmProdHost(schedulerProvider, fakeRegistration))

        val allocator = Allocator.create(
            hostRegistry,
            EntityHandleManager(
                time = FakeTime(),
                scheduler = schedulerProvider("allocator")
            )
        )

        val arcId = allocator.startArcForPlan("testArc", TestReflectiveRecipePlan)
        // Ensure that it's at least started up.
        withTimeout(1500) { AssertingReflectiveParticle.started.join() }
        allocator.stopArc(arcId)
    }
}
