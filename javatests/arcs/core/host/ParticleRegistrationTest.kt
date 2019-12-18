package arcs.core.host

import arcs.core.sdk.Particle
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ParticleRegistrationTest {
    @Test
    fun allParticlesAreRegistered() {
        ServiceLoaderHostRegistry.instance().availableArcHosts().forEach { host: ArcHost ->
            when (host) {
                is ProdHost -> assert(
                    host.registeredParticles().contains(TestProdParticle::class.java)
                )
                is TestHost -> assert(
                    host.registeredParticles().contains(TestHostParticle::class.java)
                )
            }
        }
    }

    class DummyParticle : Particle()
    class DummyHost : AbstractArcHost() {
        init {
            registerParticle(DummyParticle::class.java)
        }
    }

    @Test
    fun registerHostDynamically() {
        val hostRegistry = ServiceLoaderHostRegistry.instance()
        val dummyhost = DummyHost()
        hostRegistry.registerHost(dummyhost)
        assert(hostRegistry.availableArcHosts().contains(dummyhost))
        assert(dummyhost.registeredParticles().contains(DummyParticle::class.java))

        dummyhost.unregisterParticle(DummyParticle::class.java)
        assert(!dummyhost.registeredParticles().contains(DummyParticle::class.java))

        hostRegistry.unregisterHost(dummyhost)
        assert(!hostRegistry.availableArcHosts().contains(dummyhost))
    }
}
