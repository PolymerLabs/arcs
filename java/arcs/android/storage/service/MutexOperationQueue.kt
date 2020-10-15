package arcs.android.storage.service

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * A simple helper class to provide serialized operation execution on the provided
 * [CoroutineScope].
 */
// TODO(b/168724138): Switch to a channel/flow queue-based approach and remove this.
@OptIn(ExperimentalCoroutinesApi::class)
class MutexOperationQueue(private val scope: CoroutineScope) {
  /**
   * A mutex to serialize the incoming actions. Since coroutine mutexes process lock-waiters in
   * order, this services as a quick-and-dirty queue for us.
   */
  private val actionMutex = Mutex()

  fun launch(action: suspend () -> Unit): Job {
    // CoroutineStart.UNDISPATCHED ensures that the actions are started in order.
    return scope.launch(start = CoroutineStart.UNDISPATCHED) {
      actionMutex.withLock {
        action()
      }
    }
  }
}
