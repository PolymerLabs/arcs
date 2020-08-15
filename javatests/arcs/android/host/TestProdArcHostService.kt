package arcs.android.host

import android.content.Context
import arcs.android.host.prod.ProdArcHostService
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.TestingJvmProdHost
import arcs.core.storage.StorageEndpointManager
import arcs.jvm.host.JvmSchedulerProvider
import arcs.sdk.android.storage.AndroidStorageEndpointManager
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking

@ExperimentalCoroutinesApi
class TestProdArcHostService : ProdArcHostService() {

    override val coroutineContext = Dispatchers.Default
    override val arcSerializationCoroutineContext = Dispatchers.Default

    override val storageEndpointManager = AndroidStorageEndpointManager(
        this,
        coroutineContext,
        TestConnectionFactory(this)
    )

    override val arcHost = TestingAndroidProdHost(
        this,
        JvmSchedulerProvider(scope.coroutineContext),
        storageEndpointManager
    )


    override val arcHosts = listOf(arcHost)

    override fun onDestroy() {
        runBlocking {
            arcHost.stores.reset()
        }
    }

    class TestingAndroidProdHost(
        val context: Context,
        schedulerProvider: SchedulerProvider,
        storageEndpointManager: StorageEndpointManager,
        vararg particles: ParticleRegistration
    ) : TestingJvmProdHost(schedulerProvider, storageEndpointManager, *particles)

}
