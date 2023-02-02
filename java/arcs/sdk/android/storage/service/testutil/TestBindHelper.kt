package arcs.sdk.android.storage.service.testutil

import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import arcs.sdk.android.storage.service.BindHelper
import arcs.sdk.android.storage.service.StorageService
import kotlin.reflect.KClass
import kotlinx.atomicfu.atomic
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
 * @param storageServiceClass the StorageService class to bind to.
 * @param enforceBindIntentMatches when `true`, calling `bind` with an [Intent] that has a
 *        [ComponentName] that doesn't match the `storageServiceClass` provided to this constructor,
 *        an exception will be thrown.
 */
class TestBindHelper(
  override val context: Context,
  private val storageServiceClass: KClass<out StorageService> = StorageService::class,
  private val enforceBindIntentMatches: Boolean = false
) : BindHelper {
  private val activeBindings = atomic(0)

  private val expectedClassName = storageServiceClass.java.name

  /**
   * You can use this service controller to perform other operations on the Robolectric service
   * instance, if needed.
   */
  val serviceController: ServiceController<out StorageService> =
    Robolectric.buildService(storageServiceClass.java)

  override fun bind(intent: Intent, connection: ServiceConnection, flags: Int): Boolean {
    if (enforceBindIntentMatches) {
      check(intent.component?.className == expectedClassName) {
        "Expected bind to $expectedClassName but got ${intent.component}"
      }
    }
    val binder = serviceController.get().onBind(intent)
    connection.onServiceConnected(null, binder)
    activeBindings.incrementAndGet()
    return true
  }

  override fun unbind(connection: ServiceConnection) {
    serviceController.get().onUnbind(null)
    activeBindings.decrementAndGet()
  }

  fun activeBindings(): Int = activeBindings.value
}
