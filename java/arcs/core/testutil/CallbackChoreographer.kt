package arcs.core.testutil

import kotlinx.coroutines.Job

/**
 * This class manages the choreographed execution of a callback that takes no parameters
 * and returns [Unit].
 *
 * It will await [signalCallback] to be called, run the provided action, and then change its
 * state so that anyone waiting for [awaitCallback] will be notified.
 *
 * Example:
 * ```
 *   val callbackAction = { /* component test callback action */ }
 *   val choreographer = CallbackChoreographer(callbackAction)
 *
 *   val component = ComponentUnderTest()
 *   component.callback = choreographer::callback
 *
 *   // Do something to your component that will trigger it to run its callback.
 *   component.performAction()
 *
 *   // Now do any arbitrary actions that you want to happen before the callback logic runs.
 *   // Then signal for the callback to run:
 *   choreographer.signalCallback()
 *
 *   // Now, you can wait for a signal that the callbackAction has completed:
 *   choreographer.awaitCallback()
 *
 *   // Test conditions that should be true after the callback has completed.
 * ```
 */
class CallbackChoreographer(
  private val action: suspend () -> Unit = {}
) {
  private val startSignalJob = Job()
  private val completeSignalJob = Job()
  var actionException: Throwable? = null
    private set

  fun signalCallback() {
    startSignalJob.complete()
  }

  suspend fun awaitCallback() {
    completeSignalJob.join()
  }

  suspend fun callback() {
    startSignalJob.join()
    try {
      action()
    } catch (t: Throwable) {
      actionException = t
      throw t
    } finally {
      completeSignalJob.complete()
    }
  }
}
