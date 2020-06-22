package arcs.android.host

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.host.prod.ProdArcHostService
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.TestingJvmProdHost
import arcs.jvm.host.JvmSchedulerProvider
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
class TestProdArcHostService : ProdArcHostService() {
    override val arcHost = TestingAndroidProdHost(
        this,
        this.lifecycle,
        JvmSchedulerProvider(scope.coroutineContext)
    )

    override val arcHosts = listOf(arcHost)

    class TestingAndroidProdHost(
        val context: Context,
        val lifecycle: Lifecycle,
        schedulerProvider: SchedulerProvider,
        vararg particles: ParticleRegistration
    ) : TestingJvmProdHost(schedulerProvider, *particles) {

        @kotlinx.coroutines.ExperimentalCoroutinesApi
        override val activationFactory = ServiceStoreFactory(
            context,
            lifecycle,
            connectionFactory = TestConnectionFactory(context)
        )
    }
}
