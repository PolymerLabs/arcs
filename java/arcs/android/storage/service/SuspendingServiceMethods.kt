package arcs.android.storage.service

import android.os.IBinder
import arcs.android.crdt.CrdtExceptionProto
import arcs.android.crdt.decode
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
 * Suspends the current coroutine. The caller is provided with an [IHardReferencesRemovalCallback]
 * which can be used to signal resumption; most likely you are passing this to a corresponding
 * Android storage service manager method call.
 */
@OptIn(ExperimentalCoroutinesApi::class)
suspend fun suspendForHardReferencesCallback(block: (IHardReferencesRemovalCallback) -> Unit) =
  suspendCancellableCoroutine<Long> { block(ContinuationHardReferencesCallback(it)) }

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

  override fun onFailure(exceptionBytes: ByteArray?) {
    continuation.resumeWithException(exceptionBytes.toException())
    // We expected onSuccess or onFailure to be called once. So we are now done with this object.
    // Thus, unregister for death notifications.
    this.asBinder().unlinkToDeath(deathRecipient, UNLINK_TO_DEATH_FLAGS)
  }
}

/**
 * Helper that converts a continuation expecting an [Long] into an [IHardReferencesRemovalCallback]
 * that will complete the continuation when [onSuccess] is called, or raise an exception when
 * [onFailure] is called.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ContinuationHardReferencesCallback(private val continuation: CancellableContinuation<Long>) :
  IHardReferencesRemovalCallback.Stub() {
  override fun onSuccess(numRemoved: Long) {
    continuation.resume(numRemoved) {}
  }

  override fun onFailure(exceptionBytes: ByteArray?) {
    continuation.resumeWithException(exceptionBytes.toException())
  }
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

  override fun onResult(exceptionBytes: ByteArray?) {
    if (exceptionBytes != null) {
      continuation.resumeWithException(exceptionBytes.toException())
    } else {
      continuation.resume(true) {}
    }
    // We expected onResult be called once. So we are now done with this object.
    // Thus, unregister for death notifications.
    this.asBinder().unlinkToDeath(deathRecipient, UNLINK_TO_DEATH_FLAGS)
  }
}

private fun ByteArray?.toException(): Exception {
  return try {
    CrdtExceptionProto.parseFrom(this).decode()
  } catch (e: Exception) {
    CrdtExceptionParseException()
  }
}

class CrdtExceptionParseException : Exception("Operation failed with unparsable exception")

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
