package arcs.core.host

import arcs.jvm.host.scanForParticles

open class TestingJvmProdHost(vararg particles: ParticleRegistration) :
    TestingHost(*scanForParticles(TestingJvmProdHost::class), *particles),
    ProdHost
