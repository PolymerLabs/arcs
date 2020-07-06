package arcs.showcase.typevariables

import arcs.core.allocator.Allocator
import arcs.core.host.*
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmHost
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.FakeTime
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.coroutines.EmptyCoroutineContext

@RunWith(JUnit4::class)
@ExperimentalCoroutinesApi
class VariableEntityTest {

    class TestJvmProdHost(
        schedulerProvider: SchedulerProvider,
        vararg particles: ParticleRegistration
    ): JvmHost(schedulerProvider, *particles), ProdHost

    @Test
    fun shop_redactsSkew() = runBlocking {
        RamDisk.clear()
        DriverAndKeyConfigurator.configureKeyParsers()
        RamDiskDriverProvider()

        val hostRegistry = ExplicitHostRegistry()
        val schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)

        hostRegistry.registerHost(
            TestJvmProdHost(schedulerProvider,
                ::OrderIngestion.toRegistration(),
                ::SkuRedactor.toRegistration(),
                ::Consumer.toRegistration()
            )
        )

        val allocator = Allocator.create(
            hostRegistry,
            EntityHandleManager(
                time = FakeTime(),
                scheduler = schedulerProvider("allocator")
            )
        )

        val arcId = allocator.startArcForPlan(ShopPlan).waitForStart().id

        // Ensure that the shop recipe is fully processed.
        withTimeout(1500) {
            OrderIngestion.orderedOnce.join()
            SkuRedactor.redacted.join()
            Consumer.updated.join()
        }
        allocator.stopArc(arcId)
    }
}
