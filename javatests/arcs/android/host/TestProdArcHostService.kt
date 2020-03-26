package arcs.android.host

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.sdk.host.AndroidResurrector
import arcs.core.host.Resurrector
import arcs.core.host.TestingJvmProdHost
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory

class TestProdArcHostService : ProdArcHostService() {
    override val arcHost = TestingAndroidProdHost(this, this.lifecycle, resurrector)

    class TestingAndroidProdHost(
        val context: Context,
        val lifecycle: Lifecycle,
        androidResurrector: Resurrector
    ) : TestingJvmProdHost(androidResurrector) {
        override val activationFactory = ServiceStoreFactory(
            context,
            lifecycle,
            connectionFactory = TestConnectionFactory(context)
        )
        override val resurrector = androidResurrector
    }
}
