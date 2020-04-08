package arcs.core.host

import arcs.core.util.Scheduler
import arcs.jvm.util.testutil.FakeTime

class TestHost(
    scheduler: Scheduler,
    vararg particles: ParticleRegistration
) : AbstractArcHost(
    object : SchedulerProvider {
        override fun invoke(arcId: String) = scheduler
    },
    *particles
) {
    override val platformTime = FakeTime()
}
