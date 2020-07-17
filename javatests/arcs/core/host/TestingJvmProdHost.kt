package arcs.core.host

import arcs.jvm.host.scanForParticles
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
open class TestingJvmProdHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
) : TestingHost(schedulerProvider, *scanForParticles(TestingJvmProdHost::class), *particles),
    ProdHost
