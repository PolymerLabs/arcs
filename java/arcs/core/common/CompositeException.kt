package arcs.core.common

import java.io.PrintWriter
import java.io.StringWriter
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.supervisorScope

/**
 * This class wraps one or more exceptions that occur when running a set of operations on all
 * databases owned by a manager.
 *
 * When the exception is thrown, the output will include the stack traces for all of the wrapped
 * errors.
 */
class CompositeException(
  val exceptions: List<Throwable>
) : Exception() {
  override fun toString(): String {
    val stringWriter = StringWriter()
    PrintWriter(stringWriter).run {
      print("CompositeException: (${exceptions.size} failed ops)\n")
      exceptions.forEach {
        it.printStackTrace(this)
      }
      print("Invoked from:")
    }
    return stringWriter.toString()
  }
}

/**
 * A helper to wait for a group of [Deferred] objects to complete, collect any exceptions taht
 * occurred, and wrap the results in a composite exception, if there were any.
 */
@OptIn(ExperimentalCoroutinesApi::class)
suspend fun Collection<Deferred<*>>.toCompositeExceptionOrNull() =
  onEach { it.join() }
    .mapNotNull { it.getCompletionExceptionOrNull() }
    .takeIf { it.isNotEmpty() }
    ?.let { CompositeException(it) }

/**
 * Run a collection of jobs generated from the provided source parameters of type [T]. If any of
 * the jobs throw an exception, they'll be aggregated into a [CompositeException] which will be
 * thrown once all jobs complete
 */
@OptIn(ExperimentalCoroutinesApi::class)
suspend inline fun <T> Collection<T>.collectExceptions(
  crossinline block: suspend (T) -> Unit
) {
  supervisorScope {
    map {
      async {
        block(it)
      }
    }.toCompositeExceptionOrNull()?.let { throw(it) }
  }
}
