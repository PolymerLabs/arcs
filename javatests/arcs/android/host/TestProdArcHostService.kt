package arcs.android.host

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.core.host.TestingJvmProdHost
import kotlinx.coroutines.Dispatchers

class TestProdArcHostService : ProdArcHostService() {
    override val arcHost = TestingAndroidProdHost(this, this.lifecycle)

    class TestingAndroidProdHost(
        val context: Context,
        val lifecycle: Lifecycle
    ) : TestingJvmProdHost() {
        override fun entityHandleManager(arcId: String) = AndroidEntityHandleManager(
            context,
            lifecycle,
            arcId,
            hostId,
            Dispatchers.Default,
            TestExternalArcHostService.testConnectionFactory
        )
    }
}
