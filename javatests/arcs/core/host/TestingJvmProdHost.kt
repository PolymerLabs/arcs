package arcs.core.host

import arcs.jvm.host.scanForParticles
import kotlinx.coroutines.ExperimentalCoroutinesApi

@OptIn(ExperimentalCoroutinesApi::class)
open class TestingJvmProdHost(
  handleManagerFactory: HandleManagerFactory,
  vararg particles: ParticleRegistration
) : TestingHost(
  handleManagerFactory,
  *scanForParticles(TestingJvmProdHost::class),
  *particles
),
  ProdHost
