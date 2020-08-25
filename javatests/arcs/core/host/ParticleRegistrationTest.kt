package arcs.core.host

import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Dispatchers
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
    ) : AbstractArcHost(
        coroutineContext = Dispatchers.Default,
        updateArcHostContextCoroutineContext = Dispatchers.Default,
        schedulerProvider = schedulerProvider,
        storageEndpointManager = testStorageEndpointManager(),
        initialParticles = *particles
    ), ProdHost {
        override val platformTime = JvmTime
    }

    @Test
    fun explicit_allParticlesAreRegistered() = runBlockingTest {
        var foundProdHost = false
        var foundTestHost = false

        val hostRegistry = ExplicitHostRegistry()
        val schedulerProvider = SimpleSchedulerProvider(coroutineContext)

        hostRegistry.registerHost(
            JvmProdHost(
                schedulerProvider,
                ::TestProdParticle.toRegistration(),
                ::TestReflectiveParticle.toRegistration()
            )
        )

        hostRegistry.registerHost(
            TestHost(schedulerProvider("foo"), ::TestHostParticle.toRegistration())
        )

        hostRegistry.availableArcHosts().forEach { host: ArcHost ->
            when (host) {
                is ProdHost -> {
                    assertThat(host.registeredParticles()).contains(
                        TestProdParticle::class.toParticleIdentifier()
                    )
                    assertThat(host.registeredParticles()).contains(
                        TestReflectiveParticle::class.toParticleIdentifier()
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
