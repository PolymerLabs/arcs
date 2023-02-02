package arcs.android.host

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import arcs.core.data.Capabilities
import arcs.core.data.Capability.Shareable
import arcs.core.host.HandleManagerFactory
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.host.TestingHost
import arcs.core.storage.StorageKeyManager
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.android.labs.host.ArcHostHelper
import arcs.sdk.android.labs.host.ResurrectableHost
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.ResurrectionHelper
import arcs.sdk.android.storage.service.BindHelper
import arcs.sdk.android.storage.service.DefaultBindHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel

@OptIn(ExperimentalCoroutinesApi::class)
abstract class TestExternalArcHostService : Service() {
  protected val scope: CoroutineScope = MainScope()

  abstract val arcHost: TestingAndroidHost

  val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)

  // TODO(b/174432505): Don't use the GLOBAL_INSTANCE, use a test-specific instance.
  private val storageKeyManager = StorageKeyManager.GLOBAL_INSTANCE

  private val arcHostHelper: ArcHostHelper by lazy {
    ArcHostHelper(this, storageKeyManager, arcHost)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val result = super.onStartCommand(intent, flags, startId)
    arcHostHelper.onStartCommand(intent)
    return result
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    super.onDestroy()
    scope.cancel()
  }

  @OptIn(ExperimentalCoroutinesApi::class)
  abstract class TestingAndroidHost(
    context: Context,
    scope: CoroutineScope,
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ) : TestingHost(
    handleManagerFactory = HandleManagerFactory(
      schedulerProvider = schedulerProvider,
      storageEndpointManager = AndroidStorageServiceEndpointManager(
        scope,
        testBindHelper ?: DefaultBindHelper(context)
      ),
      platformTime = FakeTime()
    ),
    arcHostContextCapabilities = testingCapability,
    *particles
  ),
    ResurrectableHost {
    override val resurrectionHelper: ResurrectionHelper =
      ResurrectionHelper(context)
  }

  companion object {
    var testBindHelper: BindHelper? = null
    var testingCapability = Capabilities(Shareable(true))
  }
}
