package arcs.android.storage.service

import arcs.android.crdt.toProto
import arcs.core.crdt.CrdtException

/**
 * Wraps the given [action] in a try-catch block, converting any exceptions that were thrown into
 * a [CrdtException] that gets sent back via the [IResultCallback]. If there was no exception
 * thrown, invokes the callback with a `null` argument.
 */
inline fun IResultCallback.wrapException(message: String, action: () -> Unit) {
  try {
    action()
    onResult(null)
  } catch (e: Throwable) {
    onResult(CrdtException(message, e).toProto().toByteArray())
  }
}
