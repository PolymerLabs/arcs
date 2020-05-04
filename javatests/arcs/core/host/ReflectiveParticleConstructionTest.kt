package arcs.core.host

import arcs.core.allocator.Allocator
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmHost
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.coroutines.EmptyCoroutineContext


@RunWith(JUnit4::class)
@ExperimentalCoroutinesApi
class ReflectiveParticleConstructionTest {

    class JvmProdHost(
        schedulerProvider: SchedulerProvider,
        vararg particles: ParticleRegistration
    ) : JvmHost(schedulerProvider, *particles), ProdHost

    class AssertingReflectiveParticle(spec: Plan.Particle?) : TestReflectiveParticle(spec) {
        override suspend fun onCreate() = runBlocking {
            handles.data
            assertThat(schema.name?.name).isEqualTo("Thing")
            assertThat(schema.fields.singletons).containsExactly("name", FieldType.Text)
            assertThat(schema.fields.collections).isEmpty()
            started = true
        }

        companion object {
            var started = false
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

        hostRegistry.registerHost(JvmProdHost(schedulerProvider,
                                              ::TestProdParticle.toRegistration(),
                                              ::TestHostParticle.toRegistration(),
                                              fakeRegistration)
        )

        val allocator = Allocator.create(
            hostRegistry,
            EntityHandleManager(
                time = FakeTime(),
                scheduler = schedulerProvider("allocator")
            )
        )

        val arcId = allocator.startArcForPlan("testArc", TestRecipePlan)
        allocator.stopArc(arcId)
        assertThat(AssertingReflectiveParticle.started).isTrue()
    }
}
