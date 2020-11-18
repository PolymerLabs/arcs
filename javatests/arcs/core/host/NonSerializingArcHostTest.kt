package arcs.core.host

import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class NonSerializingArcHostTest : AbstractArcHostTestBase() {
  class SerializingTestHost(
    vararg particles: ParticleRegistration
  ) : TestHost(*particles) {
    override val serializationEnabled = false
  }

  override fun createHost(
    vararg particles: ParticleRegistration
  ) = SerializingTestHost(*particles)
}
