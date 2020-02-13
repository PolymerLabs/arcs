package arcs.core.host

import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmProdHost
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class)
class ParticleRegistrationTest {
    @Test
    fun explicit_allParticlesAreRegistered() = runBlockingTest {
        var foundProdHost = false
        var foundTestHost = false

        val hostRegistry = ExplicitHostRegistry()
        hostRegistry.registerHost(JvmProdHost(TestProdParticle::class))
        hostRegistry.registerHost(TestHost(TestHostParticle::class))

        hostRegistry.availableArcHosts().forEach { host: ArcHost ->
            when (host) {
                is TestHost -> {
                    assertThat(host.registeredParticles()).contains(
                        TestHostParticle::class.toParticleIdentifier()
                    )
                    foundTestHost = true
                }
                is JvmProdHost -> {
                    assertThat(host.registeredParticles()).contains(
                        TestProdParticle::class.toParticleIdentifier()
                    )
                    foundProdHost = true
                }
            }
        }
        assertThat(foundProdHost).isTrue()
        assertThat(foundTestHost).isTrue()
    }
}
