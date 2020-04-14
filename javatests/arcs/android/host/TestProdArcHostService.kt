package arcs.android.host

import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.host.prod.ProdArcHostService
import arcs.android.sdk.host.AndroidHandleManagerProvider
import arcs.core.host.TestingHost
import arcs.core.host.TestingProdHost
import arcs.jvm.host.scanForParticles
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory

class TestProdArcHostService : ProdArcHostService() {
    override val arcHost = TestingAndroidProdHost(
        this,
        this.lifecycle
    )

    override val arcHosts = listOf(arcHost)

    class TestingAndroidProdHost(
        context: Context,
        lifecycle: Lifecycle
    ) : TestingHost(AndroidHandleManagerProvider(
        context = context,
        lifecycle = lifecycle,
        connnectionFactory = TestConnectionFactory(context)
    ), *scanForParticles(TestingProdHost::class)), TestingProdHost
}
