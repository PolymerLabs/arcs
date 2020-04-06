package arcs.core.host

import arcs.jvm.host.scanForParticles

open class TestingJvmProdHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
) : TestingHost(schedulerProvider, *scanForParticles(TestingJvmProdHost::class), *particles),
    ProdHost
