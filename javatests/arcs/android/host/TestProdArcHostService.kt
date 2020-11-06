package arcs.android.host

import android.content.Context
import arcs.android.host.prod.ProdArcHostService
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.host.TestingJvmProdHost
import arcs.core.storage.StorageEndpointManager
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.testutil.TestBindHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

@OptIn(ExperimentalCoroutinesApi::class)
class TestProdArcHostService : ProdArcHostService() {
  override val auxiliaryScope = CoroutineScope(Dispatchers.Default)
  override val arcSerializationScope = CoroutineScope(Dispatchers.Default)
  val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
  override val storageEndpointManager =
    AndroidStorageServiceEndpointManager(
      scope,
      TestBindHelper(this)
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
