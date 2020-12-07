package arcs.sdk.android.storage.service

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.os.IInterface
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * This interface exists so that we can swap out normal Android service connection routines
 * with, for example, a Robolectric variant.
 *
 * In the majority of cases, you should be able to use one of the two existing implementations:
 * [DefaultBindHelper] and [TestBindHelper].
 */
interface BindHelper {
  /** A context related to this [BindHelper]. Useful for creating [Intent], for example. */
  val context: Context

  /** The method signature for [Context.bindService]. */
  fun bind(intent: Intent, connection: ServiceConnection, flags: Int): Boolean

  /** The method signature for [Context.unindService]. */
  fun unbind(connection: ServiceConnection)
}

/**
 * The default [BindHelper] implementation that uses the standard Android [context.bindService]
 * and [context.unbindService] methods.
 */
class DefaultBindHelper(
  /** A [Context] that's capable of calling [bindService] and [unbindService] methods. */
  override val context: Context
) : BindHelper {
  override fun bind(intent: Intent, connection: ServiceConnection, flags: Int): Boolean {
    return context.bindService(intent, connection, flags)
  }

  override fun unbind(connection: ServiceConnection) {
    context.unbindService(connection)
  }
}

/**
 * This represents a currently-connected service that can be disconnected. Use the
 * [BindHelper.bindForIntent] extension method on a bindHelper to get a new instance.
 *
 * If the provided scope is cancelled while the [BoundService] is still active, the instance will
 * disconnect and will no longer work.
 */
class BoundService<T : IInterface> internal constructor(
  val service: T,
  private val bindHelper: BindHelper,
  private val connection: ServiceConnection,
  scope: CoroutineScope
) {
  private val connected = atomic(true)
  private val completionJob = Job(scope.coroutineContext[Job.Key]).also {
    it.invokeOnCompletion {
      disconnect()
    }
  }

  /** Disconnect from the service. The [service] property can no longer be used. */
  fun disconnect() {
    if (connected.getAndSet(false)) {
      bindHelper.unbind(connection)
      if (!completionJob.isCompleted) {
        completionJob.complete()
      }
    }
  }
}

/**
 * Use the [BindHelper] to create and return a new [BoundService] of type [T].
 *
 * The [asInterface] parameter is most likely one of these two options:
 *  * For local-only services, pass { it as T }
 *  * For AIDL services, pass `IMyInterface.Stub::asInterface`
 *
 * If the service connection fails, this method will throw an exception.
 *
 * @param intent the Intent describing the service to connect to
 * @param asInterface a method to converter [IBinder] into your service interface type [T]
 * @param onDisconnected an optional method that will be called if the service disconnects
 */
suspend fun <T : IInterface> BindHelper.bindForIntent(
  intent: Intent,
  scope: CoroutineScope,
  asInterface: (IBinder) -> T,
  onDisconnected: (() -> Unit) = {}
): BoundService<T> {
  return suspendCancellableCoroutine { continuation ->
    SuspendServiceConnection(this, scope, continuation, onDisconnected, asInterface).run {
      val willConnect = bind(intent, this, Context.BIND_AUTO_CREATE)
      if (!willConnect) {
        continuation.resumeWithException(Exception("Won't connect"))
      }
    }
  }
}

/**
 * This helper wraps a continuation with a StorageService connection.
 */
private class SuspendServiceConnection<T : IInterface>(
  private val bindHelper: BindHelper,
  private val scope: CoroutineScope,
  private val continuation: CancellableContinuation<BoundService<T>>,
  private val onDisconnected: () -> Unit = {},
  private val asInterface: (IBinder) -> T
) : ServiceConnection {
  private lateinit var service: IBinder
  @Suppress("UNCHECKED_CAST")
  override fun onServiceConnected(name: ComponentName?, service: IBinder) {
    this.service = service
    continuation.resume(BoundService(asInterface(service), bindHelper, this, scope))
  }

  override fun onServiceDisconnected(name: ComponentName?) {
    onDisconnected()
  }
}
