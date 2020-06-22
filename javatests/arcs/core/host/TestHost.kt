package arcs.core.host

import arcs.core.util.Scheduler
import arcs.jvm.util.testutil.FakeTime
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
class TestHost(
    scheduler: Scheduler,
    vararg particles: ParticleRegistration
) : AbstractArcHost(
    object : SchedulerProvider {
        override fun invoke(arcId: String) = scheduler
        override fun cancelAll() = scheduler.cancel()
    },
    *particles
) {
    override val platformTime = FakeTime()
}
