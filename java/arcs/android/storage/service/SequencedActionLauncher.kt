package arcs.android.storage.service

import arcs.core.common.CounterFlow
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first

/** Queues up actions and launches them sequentially, in the same order they were added. */
// TODO(b/168724138): Switch to a channel/flow queue-based approach.
class SequencedActionLauncher(scope: CoroutineScope) {
  private val queue = MutexOperationQueue(scope)

  /** Tracks number of pending/in-flight actions. */
  private val counter = CounterFlow(0)

  /** Adds the given [action] to the queue and launches it when ready. */
  fun launch(action: suspend () -> Unit) {
    counter.increment()
    queue.launch(action).invokeOnCompletion { counter.decrement() }
  }

  /** Waits until the queue is empty and no actions are being run. */
  suspend fun waitUntilDone() {
    counter.flow.first { it == 0 }
  }
}
