package arcs.android.host

import android.content.Context
import arcs.android.labs.host.prod.ProdArcHostService
import arcs.core.host.HandleManagerFactory
import arcs.core.host.ParticleRegistration
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.host.TestingJvmProdHost
import arcs.jvm.util.JvmTime
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.testutil.TestBindHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

@OptIn(ExperimentalCoroutinesApi::class)
class TestProdArcHostService : ProdArcHostService() {
  override val coroutineContext = Dispatchers.Default
  override val arcSerializationCoroutineContext = Dispatchers.Default
  val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
  override val storageEndpointManager =
    AndroidStorageServiceEndpointManager(
      scope,
      TestBindHelper(this)
    )
  val handleManagerFactory = HandleManagerFactory(
    schedulerProvider,
    storageEndpointManager,
    JvmTime
  )

  override val arcHost = TestingAndroidProdHost(
    this,
    handleManagerFactory
  )

  override val arcHosts = listOf(arcHost)

  class TestingAndroidProdHost(
    val context: Context,
    handleManagerFactory: HandleManagerFactory,
    vararg particles: ParticleRegistration
  ) : TestingJvmProdHost(
    handleManagerFactory,
    *particles
  )
}
