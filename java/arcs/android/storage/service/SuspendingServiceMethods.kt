package arcs.android.storage.service

import android.os.IInterface
import arcs.core.crdt.CrdtException
import arcs.core.util.Log
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Suspends the current coroutine. The caller is provided with an [IRegistrationCallback] which
 * can be used to signal resumption; most likely you are passing this to the corresponding
 * Android storage service method call.
 */
@ExperimentalCoroutinesApi
suspend fun suspendForRegistrationCallback(block: (IRegistrationCallback) -> Unit) =
  suspendCancellableCoroutine<Int> { block(ContinuationRegistrationCallback(it)) }

/**
 * Suspends the current coroutine. The caller is provided with an [IResultCallback] which
 * can be used to signal resumption; most likely you are passing this to the corresponding
 * Android storage service method call.
 */
@ExperimentalCoroutinesApi
suspend fun suspendForResultCallback(block: (IResultCallback) -> Unit) =
  suspendCancellableCoroutine<Boolean> { block(ContinuationResultCallback(it)) }

/**
 * Helper that converts a continuation expecting an [Int] into an [IRegistrationCallback] that will
 * complete the continuation when [onSuccess] is called, or raise an exception when [onFailure] is
 * called.
 */
@ExperimentalCoroutinesApi
class ContinuationRegistrationCallback(
  private val continuation: CancellableContinuation<Int>
) : IRegistrationCallback.Stub() {
  init {
    handleDeath(continuation)
  }

  override fun onSuccess(token: Int) {
    continuation.resume(token) {}
  }

  override fun onFailure(exception: ByteArray?) {
    continuation.resumeWithException(Exception("Registration failed"))
  }
}

/**
 * Helper that converts a continuation expecting an [Int] into an [IRegistrationCallback] that will
 * complete the continuation when [onSuccess] is called, or raise an exception when [onFailure] is
 * called.
 */
@ExperimentalCoroutinesApi
class ContinuationResultCallback(
  private val continuation: CancellableContinuation<Boolean>
) : IResultCallback.Stub() {
  init {
    handleDeath(continuation)
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
  }
}

/**
 * Base class for the Continuation-wrappping callback objects. It takes care of setting up the
 * death handler.
 */
fun IInterface.handleDeath(continuation: CancellableContinuation<*>) {
  this.asBinder().linkToDeath(
    { continuation.resumeWithException(Exception("Service died")) },
    0
  )
}
