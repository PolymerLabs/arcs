package arcs.android.host

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import arcs.core.data.Capabilities
import arcs.core.data.Capability.Shareable
import arcs.core.host.ParticleRegistration
import arcs.core.host.TestingHost
import arcs.sdk.android.labs.host.ArcHostHelper
import arcs.sdk.android.labs.host.ResurrectableHost
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.ResurrectionHelper
import arcs.sdk.android.storage.service.BindHelper
import arcs.sdk.android.storage.service.DefaultBindHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel

@OptIn(ExperimentalCoroutinesApi::class)
abstract class TestExternalArcHostService : Service() {
  protected val scope: CoroutineScope = MainScope()

  abstract val arcHost: TestingAndroidHost

  private val arcHostHelper: ArcHostHelper by lazy {
    ArcHostHelper(this, arcHost)
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
    vararg particles: ParticleRegistration
  ) : TestingHost(
    AndroidStorageServiceEndpointManager(
      scope,
      testBindHelper ?: DefaultBindHelper(context)
    ),
    *particles
  ),
    ResurrectableHost {
    override val resurrectionHelper: ResurrectionHelper =
      ResurrectionHelper(context, ::onResurrected)

    override val arcHostContextCapability = testingCapability
  }

  companion object {
    var testBindHelper: BindHelper? = null
    var testingCapability = Capabilities(Shareable(true))
  }
}
