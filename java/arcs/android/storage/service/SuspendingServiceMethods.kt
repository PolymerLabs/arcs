package arcs.android.storage.service

import android.os.IBinder
import arcs.core.crdt.CrdtException
import arcs.core.util.Log
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.suspendCancellableCoroutine

// The documentation provides no information about these flags, and any examples seem to
// always use 0, so we use 0 here.
private const val UNLINK_TO_DEATH_FLAGS = 0
private const val LINK_TO_DEATH_FLAGS = 0

/**
 * Suspends the current coroutine. The caller is provided with an [IRegistrationCallback] which
 * can be used to signal resumption; most likely you are passing this to the corresponding
 * Android storage service method call.
 */
@OptIn(ExperimentalCoroutinesApi::class)
suspend fun suspendForRegistrationCallback(block: (IRegistrationCallback) -> Unit) =
  suspendCancellableCoroutine<Int> { block(ContinuationRegistrationCallback(it)) }

/**
 * Suspends the current coroutine. The caller is provided with an [IResultCallback] which
 * can be used to signal resumption; most likely you are passing this to the corresponding
 * Android storage service method call.
 */
@OptIn(ExperimentalCoroutinesApi::class)
suspend fun suspendForResultCallback(block: (IResultCallback) -> Unit) =
  suspendCancellableCoroutine<Boolean> { block(ContinuationResultCallback(it)) }

/**
 * Helper that converts a continuation expecting an [Int] into an [IRegistrationCallback] that will
 * complete the continuation when [onSuccess] is called, or raise an exception when [onFailure] is
 * called.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ContinuationRegistrationCallback(
  private val continuation: CancellableContinuation<Int>
) : IRegistrationCallback.Stub() {

  // If the process on the other side of this binder dies, we want to make sure to
  // signal to the caller via the continuation. This creates a [ContinuationDeathRecipient],
  // registers it for death notification, and saves a reference to it for removal.
  private val deathRecipient = ContinuationDeathRecipient(continuation).also {
    this.asBinder().linkToDeath(it, LINK_TO_DEATH_FLAGS)
  }

  override fun onSuccess(token: Int) {
    continuation.resume(token) {}
    // We expected onSuccess or onFailure to be called once. So we are now done with this object.
    // Thus, unregister for death notifications.
    this.asBinder().unlinkToDeath(deathRecipient, UNLINK_TO_DEATH_FLAGS)
  }

  override fun onFailure(exception: ByteArray?) {
    continuation.resumeWithException(RegistrationFailureException())
    // We expected onSuccess or onFailure to be called once. So we are now done with this object.
    // Thus, unregister for death notifications.
    this.asBinder().unlinkToDeath(deathRecipient, UNLINK_TO_DEATH_FLAGS)
  }

  class RegistrationFailureException : Exception("Registration failed")
}

/**
 * Helper that converts a continuation expecting an [Int] into an [IRegistrationCallback] that will
 * complete the continuation when [onSuccess] is called, or raise an exception when [onFailure] is
 * called.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ContinuationResultCallback(
  private val continuation: CancellableContinuation<Boolean>
) : IResultCallback.Stub() {

  // If the process on the other side of this binder dies, we want to make sure to
  // signal to the caller via the continuation. This creates a [ContinuationDeathRecipient],
  // registers it for death notification, and saves a reference to it for removal.
  private val deathRecipient = ContinuationDeathRecipient(continuation).also {
    this.asBinder().linkToDeath(it, LINK_TO_DEATH_FLAGS)
  }

  override fun onResult(exception: ByteArray?) {
    val result = (exception == null)
    if (!result) {
      // TODO(#5551): Consider logging at debug level with exceptionProto.message detail.
      // val exceptionProto = decodeProto(exception, CrdtExceptionProto.getDefaultInstance())
      Log.warning(CrdtException("CRDT Exception: error detail elided.")) {
        "Result was unsuccessful"
      }
    }
    continuation.resume(result) {}
    // We expected onResult be called once. So we are now done with this object.
    // Thus, unregister for death notifications.
    this.asBinder().unlinkToDeath(deathRecipient, UNLINK_TO_DEATH_FLAGS)
  }
}

/**
 * An implementation of [IBinder.DeathRecipient] that will raise an exception via a coroutine
 * continuation on binder death.
 */
private class ContinuationDeathRecipient(
  private val continuation: CancellableContinuation<*>
) : IBinder.DeathRecipient {
  override fun binderDied() {
    if (continuation.isActive) {
      continuation.resumeWithException(BinderDiedException())
    }
  }

  class BinderDiedException : IllegalStateException("Service died")
}
