package arcs.core.host

import arcs.core.util.Scheduler
import arcs.jvm.util.testutil.FakeTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
class TestHost(
    scheduler: Scheduler,
    vararg particles: ParticleRegistration
) : AbstractArcHost(
    coroutineContext = Dispatchers.Default,
    updateArcHostContextCoroutineContext = Dispatchers.Default,
    schedulerProvider = object : SchedulerProvider {
        override fun invoke(arcId: String) = scheduler
        override fun cancelAll() = scheduler.cancel()
    },
    initialParticles = *particles
) {
    override val platformTime = FakeTime()
}
