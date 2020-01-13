package arcs.core.host

import arcs.core.sdk.Particle
import arcs.jvm.host.ServiceLoaderHostRegistry
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

        ServiceLoaderHostRegistry.availableArcHosts.forEach { host: ArcHost ->
            when (host) {
                is ProdHost -> {
                    assertThat(host.registeredParticles).contains(TestProdParticle::class)
                    foundProdHost = true
                }
                is TestHost -> {
                    assertThat(host.registeredParticles).contains(TestHostParticle::class)
                    foundTestHost = true
                }
            }
        }
        assertThat(foundProdHost).isTrue()
        assertThat(foundTestHost).isTrue()
    }

    class DummyParticle : Particle
    class DummyHost : AbstractArcHost() {
        init {
            registerParticle(DummyParticle::class)
        }
    }

    @Test
    fun serviceLoader_registerHostDynamically() {
        val hostRegistry = ServiceLoaderHostRegistry
        val dummyhost = DummyHost()
        hostRegistry.registerHost(dummyhost)
        assertThat(hostRegistry.availableArcHosts).contains(dummyhost)
        assertThat(dummyhost.registeredParticles).contains(DummyParticle::class)

        dummyhost.unregisterParticle(DummyParticle::class)
        assertThat(dummyhost.registeredParticles).doesNotContain(DummyParticle::class)

        hostRegistry.unregisterHost(dummyhost)
        assertThat(hostRegistry.availableArcHosts).doesNotContain(dummyhost)
    }

    @Test
    fun explicit_allParticlesAreRegistered() {
        var foundProdHost = false
        var foundTestHost = false

        ExplicitHostRegistry.registerHost(ProdHost())
        ExplicitHostRegistry.registerHost(TestHost())
        ExplicitHostRegistry.registerParticles(
            listOf(TestProdParticle::class, TestHostParticle::class)
        )
        ExplicitHostRegistry.availableArcHosts.forEach { host: ArcHost ->
            when (host) {
                is ProdHost -> {
                    assertThat(host.registeredParticles).contains(TestProdParticle::class)
                    foundProdHost = true
                }
                is TestHost -> {
                    assertThat(host.registeredParticles).contains(TestHostParticle::class)
                    foundTestHost = true
                }
            }
        }
        assertThat(foundProdHost).isTrue()
        assertThat(foundTestHost).isTrue()
    }
}
