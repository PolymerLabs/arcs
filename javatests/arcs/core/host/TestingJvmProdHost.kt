package arcs.core.host

import arcs.jvm.host.scanForParticles
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
open class TestingJvmProdHost(
    vararg particles: ParticleRegistration
) : TestingHost(*scanForParticles(TestingJvmProdHost::class), *particles),
    ProdHost
