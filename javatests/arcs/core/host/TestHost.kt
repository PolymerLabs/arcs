package arcs.core.host

import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.util.Scheduler
import arcs.jvm.util.testutil.FakeTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

@OptIn(ExperimentalCoroutinesApi::class)
class TestHost(
  scheduler: Scheduler,
  vararg particles: ParticleRegistration
) : AbstractArcHost(
  coroutineContext = Dispatchers.Default,
  updateArcHostContextCoroutineContext = Dispatchers.Default,
  schedulerProvider = object : SchedulerProvider {
    override fun invoke(arcId: String) = scheduler
    override fun cancelAll() = scheduler.cancel()
  },
  storageEndpointManager = testStorageEndpointManager(),
  initialParticles = particles
) {
  override val platformTime = FakeTime()
}
