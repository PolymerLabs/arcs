package arcs.android.storage.service.testing

import arcs.android.crdt.CrdtExceptionProto
import arcs.android.storage.service.IResultCallback
import arcs.android.util.decodeProto
import kotlinx.coroutines.Job

/**
 * Implementation of [IResultCallback] for testing. Records the result that was passed to the
 * callback, and provides a helper method for waiting for a result.
 */
class FakeResultCallback : IResultCallback.Stub() {
  private var errorMessage: String? = null
  private val job = Job()

  val hasBeenCalled: Boolean
    get() = job.isCompleted

  override fun onResult(exception: ByteArray?) {
    check(!hasBeenCalled) { "onResult has already been called" }
    if (exception != null) {
      val proto = decodeProto(exception, CrdtExceptionProto.getDefaultInstance())
      errorMessage = proto.message
    }
    job.complete()
  }

  /**
   * Waits for the callback to be invoked and then returns the error message, or `null` if
   * successful.
   */
  suspend fun waitForResult(): String? {
    job.join()
    return errorMessage
  }
}
