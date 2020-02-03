package arcs.core.host

import arcs.core.data.ParticleSpec
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmProdHost
import arcs.sdk.Particle
import arcs.jvm.host.ServiceLoaderHostRegistry
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class)
class ParticleRegistrationTest {
    @Test
    fun serviceLoader_allParticlesAreRegistered() = runBlockingTest {
        var foundProdHost = false
        var foundTestHost = false

        ServiceLoaderHostRegistry.availableArcHosts().forEach { host: ArcHost ->
            when (host) {
                is JvmProdHost -> {
                    assertThat(host.registeredParticles()).contains(TestProdParticle::class)
                    foundProdHost = true
                }
                is TestHost -> {
                    assertThat(host.registeredParticles()).contains(TestHostParticle::class)
                    foundTestHost = true
                }
            }
        }
        assertThat(foundProdHost).isTrue()
        assertThat(foundTestHost).isTrue()
    }

    class DummyParticle : Particle
    class DummyHost : AbstractArcHost() {
        override val hostName = this::class.java.canonicalName!!
        override suspend fun isHostForSpec(spec: ParticleSpec): Boolean {
            return this.registeredParticles().map { it.java.getCanonicalName() }
                .contains(spec.location)
        }
        init {
            runBlocking { registerParticle(DummyParticle::class) }
        }
    }

    @Test
    fun serviceLoader_registerHostDynamically() = runBlockingTest {
        val hostRegistry = ServiceLoaderHostRegistry
        val dummyhost = DummyHost()
        hostRegistry.registerHost(dummyhost)
        assertThat(hostRegistry.availableArcHosts()).contains(dummyhost)
        assertThat(dummyhost.registeredParticles()).contains(DummyParticle::class)

        dummyhost.unregisterParticle(DummyParticle::class)
        assertThat(dummyhost.registeredParticles()).doesNotContain(DummyParticle::class)

        hostRegistry.unregisterHost(dummyhost)
        assertThat(hostRegistry.availableArcHosts()).doesNotContain(dummyhost)
    }

    @Test
    fun explicit_allParticlesAreRegistered() = runBlockingTest {
        var foundProdHost = false
        var foundTestHost = false

        ExplicitHostRegistry.registerHost(JvmProdHost())
        ExplicitHostRegistry.registerHost(TestHost())
        ExplicitHostRegistry.registerParticles(
            listOf(TestProdParticle::class, TestHostParticle::class)
        )
        ExplicitHostRegistry.availableArcHosts().forEach { host: ArcHost ->
            when (host) {
                is ProdHost -> {
                    assertThat(host.registeredParticles()).contains(TestProdParticle::class)
                    foundProdHost = true
                }
                is TestHost -> {
                    assertThat(host.registeredParticles()).contains(TestHostParticle::class)
                    foundTestHost = true
                }
            }
        }
        assertThat(foundProdHost).isTrue()
        assertThat(foundTestHost).isTrue()
    }
}
