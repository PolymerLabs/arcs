package arcs.core.host

import arcs.jvm.util.testutil.TimeImpl

class TestHost(
    vararg particles: ParticleRegistration
) : AbstractArcHost(*particles) {
    override val platformTime = TimeImpl()
}
