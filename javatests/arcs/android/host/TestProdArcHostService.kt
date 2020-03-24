package arcs.android.host

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.storage.handle.AndroidHandleManager
import arcs.core.host.TestingJvmProdHost
import arcs.core.host.EntityHandleManager
import kotlinx.coroutines.Dispatchers

class TestProdArcHostService : ProdArcHostService() {
    override val arcHost = TestingAndroidProdHost(this, this.lifecycle)

    class TestingAndroidProdHost(
        val context: Context,
        val lifecycle: Lifecycle
    ) : TestingJvmProdHost() {
        override fun entityHandleManager(arcId: String) = EntityHandleManager(
            AndroidHandleManager(
                context,
                lifecycle,
                Dispatchers.Default,
                TestExternalArcHostService.testConnectionFactory
            ),
            arcId,
            hostId
        )
    }
}
