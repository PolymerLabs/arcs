package arcs.android.host

import android.content.Context
import arcs.android.host.prod.ProdArcHostService
import arcs.core.host.ParticleRegistration
import arcs.core.host.TestingJvmProdHost
import arcs.jvm.host.DirectHandleManagerProvider
import arcs.jvm.host.JvmSchedulerProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
class TestProdArcHostService : ProdArcHostService() {
    override val arcHost = TestingAndroidProdHost(this)

    override val coroutineContext = Dispatchers.Default
    override val arcSerializationCoroutineContext = Dispatchers.Default

    override val arcHosts = listOf(arcHost)

    override val handleManagerProvider =
        DirectHandleManagerProvider(JvmSchedulerProvider(coroutineContext))

    class TestingAndroidProdHost(
        val context: Context,
        vararg particles: ParticleRegistration
    ) : TestingJvmProdHost(*particles)
}
