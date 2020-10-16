package arcs.sdk.android.storage.service.testutil

import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import arcs.sdk.android.storage.service.BindHelper
import arcs.sdk.android.storage.service.StorageService
import org.robolectric.Robolectric
import org.robolectric.android.controller.ServiceController

/**
 * An implementation of [BindHelper] that can be used in Robolectric tests.
 *
 * The lifecycle of the service instance will be slightly different than that of a Service running
 * on a device or emulator.
 *
 * * The service instance will be created as soon as this helper is instantiated, rather than just
 *   before the first binding occurs.
 * * onDestroy will never be called automatically. You can call it manually using the
 *   [serviceController] property that's exposed.
 * * Multiple instances of the same binding will be created for multiple bind calls, rather than
 *   caching and re-using instances, as Android will do.
 *
 * @param context the application [Context] that your test is using.
 */
class TestBindHelper(
  override val context: Context
) : BindHelper {
  /**
   * You can use this service controller to perform other operations on the Robolectric service
   * instance, if needed.
   */
  val serviceController: ServiceController<StorageService> =
    Robolectric.buildService(StorageService::class.java).create()

  override fun bind(intent: Intent, connection: ServiceConnection, flags: Int): Boolean {
    val binder = serviceController.get().onBind(intent)
    connection.onServiceConnected(null, binder)
    return true
  }

  override fun unbind(connection: ServiceConnection) {
    serviceController.get().onUnbind(null)
  }
}
