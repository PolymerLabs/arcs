package arcs.core.host

import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.jvm.util.testutil.FakeTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

@OptIn(ExperimentalCoroutinesApi::class)
class TestHost(
  schedulerProvider: SchedulerProvider,
  vararg particles: ParticleRegistration
) : AbstractArcHost(
  coroutineContext = Dispatchers.Default,
  updateArcHostContextCoroutineContext = Dispatchers.Default,
  schedulerProvider = schedulerProvider,
  storageEndpointManager = testStorageEndpointManager(),
  initialParticles = particles
) {
  override val platformTime = FakeTime()
}
