package arcs.core.host

import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.TestHandleManagerProvider
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ParticleRegistrationTest {
    class JvmProdHost(
        vararg particles: ParticleRegistration
    ) : AbstractArcHost(TestHandleManagerProvider(), *particles), ProdHost

    class OtherHost(
        vararg particles: ParticleRegistration
    ) : AbstractArcHost(TestHandleManagerProvider(), *particles)

    @Test
    fun explicit_allParticlesAreRegistered() = runBlockingTest {
        var foundProdHost = false
        var foundTestHost = false

        val hostRegistry = ExplicitHostRegistry()
        val schedulerProvider = JvmSchedulerProvider(coroutineContext)
        hostRegistry.registerHost(JvmProdHost(::TestProdParticle.toRegistration()))
        hostRegistry.registerHost(OtherHost(::TestHostParticle.toRegistration()))


        hostRegistry.availableArcHosts().forEach { host: ArcHost ->
            when (host) {
                is ProdHost -> {
                    assertThat(host.registeredParticles()).contains(
                        TestProdParticle::class.toParticleIdentifier()
                    )
                    foundProdHost = true
                }
                is OtherHost -> {
                    assertThat(host.registeredParticles()).contains(
                        TestHostParticle::class.toParticleIdentifier()
                    )
                    foundTestHost = true
                }
            }
        }
        assertThat(foundProdHost).isTrue()
        assertThat(foundTestHost).isTrue()

        schedulerProvider.cancelAll()
    }
}
