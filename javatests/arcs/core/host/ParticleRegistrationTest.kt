package arcs.core.host

import arcs.core.data.Plan
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmHost
import arcs.jvm.host.JvmSchedulerProvider
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
        schedulerProvider: SchedulerProvider,
        vararg particles: ParticleRegistration
    ) : JvmHost(schedulerProvider, *particles), ProdHost

    @Test
    fun explicit_allParticlesAreRegistered() = runBlockingTest {
        var foundProdHost = false
        var foundTestHost = false

        val hostRegistry = ExplicitHostRegistry()
        val schedulerProvider = JvmSchedulerProvider(coroutineContext)

        val dynamicRegistration = TestConstructedParticle::class.toParticleIdentifier() to
            object : ParticleConstructor.Spec() {
                override fun invoke(spec: Plan.Particle) = build(spec)
            }

        hostRegistry.registerHost(JvmProdHost(schedulerProvider,
                                              ::TestProdParticle.toRegistration(),
                                              dynamicRegistration)
        )

        hostRegistry.registerHost(TestHost(schedulerProvider("foo"),
                                           ::TestHostParticle.toRegistration()))

        hostRegistry.availableArcHosts().forEach { host: ArcHost ->
            when (host) {
                is ProdHost -> {
                    assertThat(host.registeredParticles()).contains(
                        TestProdParticle::class.toParticleIdentifier()
                    )
                    assertThat(host.registeredParticles()).contains(
                        TestConstructedParticle::class.toParticleIdentifier()
                    )
                    foundProdHost = true
                }
                is TestHost -> {
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
