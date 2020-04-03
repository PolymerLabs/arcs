package arcs.core.host

import arcs.jvm.util.testutil.FakeTime

class TestHost(
    vararg particles: ParticleRegistration
) : AbstractArcHost(*particles) {
    override val platformTime = FakeTime()
}
