package arcs.android.host

import android.content.Context
import arcs.android.host.prod.ProdArcHostService
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.host.TestingJvmProdHost
import arcs.core.storage.StorageEndpointManager
import arcs.sdk.android.storage.androidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
class TestProdArcHostService : ProdArcHostService() {
    override val coroutineContext = Dispatchers.Default
    override val arcSerializationCoroutineContext = Dispatchers.Default
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    override val storageEndpointManager =
        androidStorageServiceEndpointManager(
            this,
            Dispatchers.Default,
            TestConnectionFactory(this)
        )

    override val arcHost = TestingAndroidProdHost(
        this,
        schedulerProvider,
        storageEndpointManager
    )

    override val arcHosts = listOf(arcHost)

    class TestingAndroidProdHost(
        val context: Context,
        schedulerProvider: SchedulerProvider,
        storageEndpointManager: StorageEndpointManager,
        vararg particles: ParticleRegistration
    ) : TestingJvmProdHost(
        schedulerProvider,
        storageEndpointManager,
        *particles
    )
}
