package arcs.core.host

import arcs.jvm.host.DirectHandleManagerProvider
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.FakeTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
class TestHost(
    vararg particles: ParticleRegistration
) : AbstractArcHost(
    coroutineContext = Dispatchers.Default,
    updateArcHostContextCoroutineContext = Dispatchers.Default,
    handleManagerProvider = DirectHandleManagerProvider(
        JvmSchedulerProvider(Dispatchers.Default),
        time = FakeTime()
    ),
    initialParticles = *particles
)
