package arcs.core.host

import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.jvm.util.testutil.FakeTime

/** Fake [ArcHost] that let's us view pausing behavior for tests. */
class PausableTestingHost(
  schedulerProvider: SchedulerProvider,
  vararg particles: ParticleRegistration
) : TestingHost(
  HandleManagerFactory(
    schedulerProvider = schedulerProvider,
    storageEndpointManager = testStorageEndpointManager(),
    platformTime = FakeTime()
  ), *particles
) {

  override suspend fun pause() {
    super.pause()
    numPauses++
  }

  override suspend fun unpause() {
    super.unpause()
    numUnpauses++
  }

  companion object {
    var numPauses = 0
    var numUnpauses = 0
  }
}
