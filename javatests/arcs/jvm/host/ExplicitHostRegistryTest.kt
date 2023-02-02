package arcs.jvm.host

import arcs.core.host.AbstractArcHost
import arcs.core.host.ArcHost
import arcs.core.host.HandleManagerFactory
import arcs.core.host.ParticleRegistration
import arcs.core.host.ProdHost
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.host.StoreBasedArcHostContextSerializer
import arcs.core.host.TestHost
import arcs.core.host.TestHostParticle
import arcs.core.host.TestProdParticle
import arcs.core.host.TestReflectiveParticle
import arcs.core.host.toParticleIdentifier
import arcs.core.host.toRegistration
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ExplicitHostRegistryTest {
  class JvmProdHost(
    handleManagerFactory: HandleManagerFactory,
    vararg particles: ParticleRegistration
  ) : AbstractArcHost(
    coroutineContext = Dispatchers.Default,
    handleManagerFactory = handleManagerFactory,
    arcHostContextSerializer = StoreBasedArcHostContextSerializer(
      Dispatchers.Default,
      handleManagerFactory
    ),
    initialParticles = particles
  ),
    ProdHost

  @Test
  fun explicitHostRegistry_registeringTwoHostsWithParticles_givesAllHostsWithCorrectParticles() =
    runBlockingTest {
      var foundProdHost = false
      var foundTestHost = false

      val hostRegistry = ExplicitHostRegistry()
      val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
      val handleManagerFactory = HandleManagerFactory(
        schedulerProvider = schedulerProvider,
        storageEndpointManager = testStorageEndpointManager(),
        platformTime = JvmTime
      )

      hostRegistry.registerHost(
        JvmProdHost(
          handleManagerFactory,
          ::TestProdParticle.toRegistration(),
          ::TestReflectiveParticle.toRegistration()
        )
      )

      hostRegistry.registerHost(
        TestHost(handleManagerFactory, ::TestHostParticle.toRegistration())
      )

      hostRegistry.availableArcHosts().forEach { host: ArcHost ->
        when (host) {
          is ProdHost -> {
            Truth.assertThat(host.registeredParticles()).contains(
              TestProdParticle::class.toParticleIdentifier()
            )
            Truth.assertThat(host.registeredParticles()).contains(
              TestReflectiveParticle::class.toParticleIdentifier()
            )
            foundProdHost = true
          }
          is TestHost -> {
            Truth.assertThat(host.registeredParticles()).contains(
              TestHostParticle::class.toParticleIdentifier()
            )
            foundTestHost = true
          }
        }
      }
      Truth.assertThat(foundProdHost).isTrue()
      Truth.assertThat(foundTestHost).isTrue()

      schedulerProvider.cancelAll()
    }
}
