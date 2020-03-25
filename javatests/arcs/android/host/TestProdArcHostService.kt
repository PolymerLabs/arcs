package arcs.android.host

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.core.host.TestingJvmProdHost
import arcs.sdk.android.storage.ServiceStoreFactory

class TestProdArcHostService : ProdArcHostService() {
    override val arcHost = TestingAndroidProdHost(this, this.lifecycle)

    class TestingAndroidProdHost(
        val context: Context,
        val lifecycle: Lifecycle
    ) : TestingJvmProdHost() {
        override val activationFactory = ServiceStoreFactory(context, lifecycle)
    }
}
