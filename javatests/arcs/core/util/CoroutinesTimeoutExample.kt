package arcs.core.util

import kotlinx.coroutines.CompletableDeferred
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlinx.coroutines.debug.junit4.CoroutinesTimeout
import kotlinx.coroutines.runBlocking

@RunWith(JUnit4::class)
class CoroutinesTimeoutExample {
  @get:Rule
  val timeoutRule = CoroutinesTimeout(10000)

  @Test
  fun hangingCoroutine_triggersCoroutinesTimeout() = runBlocking {
    hangingMethod()
  }

  // This example method creates a `CompleteDeferred` and then calls [await] on it, which will
  // suspend indefinitely. This is a good example of the sort of error that might result in
  // difficult-to-diagnose hanging errors when using coroutines.
  suspend fun hangingMethod() {
    val deferred = CompletableDeferred<Unit>()

    // Comment out this line to see the timeout occur.
    deferred.complete(Unit)

    deferred.await()
  }
}
