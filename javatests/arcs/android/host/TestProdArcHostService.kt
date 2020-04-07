package arcs.android.host

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.host.prod.ProdArcHostService
import arcs.core.host.ParticleRegistration
import arcs.core.host.TestingJvmProdHost
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory

class TestProdArcHostService : ProdArcHostService() {
    override val arcHost = TestingAndroidProdHost(this, this.lifecycle)

    class TestingAndroidProdHost(
        val context: Context,
        val lifecycle: Lifecycle,
        vararg particles: ParticleRegistration
    ) : TestingJvmProdHost(*particles) {
        override val activationFactory = ServiceStoreFactory(
            context,
            lifecycle,
            connectionFactory = TestConnectionFactory(context)
        )
    }
}
