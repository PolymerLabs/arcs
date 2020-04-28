package arcs.core.host

import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmHost
import arcs.jvm.host.JvmSchedulerProvider
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


@RunWith(JUnit4::class)
@ExperimentalCoroutinesApi
class ReflectiveParticleConstructionTest {

    class JvmProdHost(
        schedulerProvider: SchedulerProvider,
        vararg particles: ParticleRegistration
    ) : JvmHost(schedulerProvider, *particles), ProdHost

    @Test
    fun canCreateReflectiveParticle() = runBlocking {

        val hostRegistry = ExplicitHostRegistry()
        val schedulerProvider = JvmSchedulerProvider(coroutineContext)

        hostRegistry.registerHost(JvmProdHost(schedulerProvider,
                                              ::TestProdParticle.toRegistration(),
                                              ::TestPlannedParticle.toRegistration())
        )
    }


}
