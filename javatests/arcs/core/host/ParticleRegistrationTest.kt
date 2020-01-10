package arcs.core.host

import arcs.core.sdk.Particle
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ParticleRegistrationTest {
    @Test
    fun serviceLoader_allParticlesAreRegistered() {
        var foundProdHost = false
        var foundTestHost = false

        ServiceLoaderHostRegistry.instance.availableArcHosts().forEach { host: ArcHost ->
            when (host) {
                is ProdHost -> {
                    assertThat(TestProdParticle::class).isIn(
                        host.registeredParticles()
                    )

                    foundProdHost = true
                }
                is TestHost -> {
                    assertThat(TestHostParticle::class).isIn(
                        host.registeredParticles()
                    )
                    foundTestHost = true
                }
            }
        }
        assertThat(foundProdHost).isEqualTo(true)
        assertThat(foundTestHost).isEqualTo(true)
    }

    class DummyParticle : Particle
    class DummyHost : AbstractArcHost() {
        init {
            registerParticle(DummyParticle::class)
        }
    }

    @Test
    fun serviceLoader_registerHostDynamically() {
        val hostRegistry = ServiceLoaderHostRegistry.instance
        val dummyhost = DummyHost()
        hostRegistry.registerHost(dummyhost)
        assertThat(dummyhost).isIn(hostRegistry.availableArcHosts())
        assertThat(DummyParticle::class).isIn(dummyhost.registeredParticles())

        dummyhost.unregisterParticle(DummyParticle::class)
        assertThat(DummyParticle::class).isNotIn(dummyhost.registeredParticles())

        hostRegistry.unregisterHost(dummyhost)
        assertThat(dummyhost).isNotIn(hostRegistry.availableArcHosts())
    }

    @Test
    fun explicit_allParticlesAreRegistered() {
        var foundProdHost = false
        var foundTestHost = false

        ExplicitHostRegistry.instance.registerHost(ProdHost())
        ExplicitHostRegistry.instance.registerHost(TestHost())
        ExplicitHostRegistry.instance
            .registerParticles(listOf(TestProdParticle::class, TestHostParticle::class))
        ExplicitHostRegistry.instance.availableArcHosts().forEach { host: ArcHost ->
            when (host) {
                is ProdHost -> {
                    assertThat(TestProdParticle::class).isIn(
                        host.registeredParticles()
                    )

                    foundProdHost = true
                }
                is TestHost -> {
                    assertThat(TestHostParticle::class).isIn(
                        host.registeredParticles()
                    )
                    foundTestHost = true
                }
            }
        }
        assertThat(foundProdHost).isEqualTo(true)
        assertThat(foundTestHost).isEqualTo(true)
    }
}
