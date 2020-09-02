package arcs.core.storage.util

import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * A very basic implementation of [OperationQueue]. It dispatches jobs on coroutines in the
 * coroutine context of callers of the [enqueue] method.
 *
 * If an [onEmpty] method is provided at construction, that method will run at the end of
 * any drain cycle.
 */
class SimpleQueue(
    private val onEmpty: (suspend () -> Unit)? = null
) : OperationQueue {

    private val mutex = Mutex()
    @OptIn(ExperimentalStdlibApi::class)
    private val queue = ArrayDeque<suspend () -> Unit>()
    private var drainJob: Job? = null

    /**
     * Places the provided block on the internal operation queue.
     *
     * If there is not a coroutine currently draining the queue, one will be started, using
     * the coroutineContext of the caller.
     *
     * It's safe to call this method from any thread/coroutine.
     */
    override suspend fun enqueue(op: Op) = mutex.withLock {
        // Update the queue, and at the same time, check if any drain coroutines are running.
        queue += op

        if (drainJob == null) {
            drainJob = CoroutineScope(coroutineContext).launch {
                drain()
            }
        }
    }

    @OptIn(ExperimentalStdlibApi::class)
    private suspend fun drain() {
        do {
            val item = mutex.withLock {
                if (queue.size > 0) {
                    queue.removeAt(0)
                } else {
                    // We are done: trigger onEmpty, and null out the drain job to signal that
                    // another should be started.
                    // It's ok if a new one starts before this completes, since it will just
                    // be exiting.
                    // We call onEmpty below, outside of the lock, so it's ok to call `enqueue`
                    // from an `onEmpty` method
                    drainJob = null
                    null
                }
            }

            when (item) {
                null -> onEmpty?.invoke()
                else -> item.invoke()
            }
        } while (item != null)
    }
}
