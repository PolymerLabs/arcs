package arcs.core.host

import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.jvm.util.testutil.FakeTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

@OptIn(ExperimentalCoroutinesApi::class)
class TestHost(
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
) {
  constructor(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ) : this(
    HandleManagerFactory(
      schedulerProvider = schedulerProvider,
      storageEndpointManager = testStorageEndpointManager(),
      platformTime = FakeTime()
    ),
    *particles
  )
}
