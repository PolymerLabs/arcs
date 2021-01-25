package arcs.core.host

import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class NonSerializingArcHostTest : AbstractArcHostTestBase() {

  class SerializingTestHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ) : TestHost(schedulerProvider, false, *particles)

  override fun createHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ) = SerializingTestHost(schedulerProvider, *particles)
}
