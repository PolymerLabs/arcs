package arcs.core.host

import arcs.core.storage.StorageEndpointManager
import arcs.jvm.host.scanForParticles
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
open class TestingJvmProdHost(
  schedulerProvider: SchedulerProvider,
  storageEndpointManager: StorageEndpointManager,
  vararg particles: ParticleRegistration
) : TestingHost(
  schedulerProvider,
  storageEndpointManager,
  *scanForParticles(TestingJvmProdHost::class),
  *particles
),
  ProdHost
