package arcs.core.storage.util

import kotlinx.coroutines.CompletableDeferred

typealias Op = suspend () -> Unit

/**
 * A simple interface describing a queue of operations that's processed in-order, one at a time.
 *
 * It's currently used by [ReferenceModeStore].
 */
interface OperationQueue {
    /**
     * Places the provided block on the internal operation queue.
     *
     * If there is not a coroutine currently draining the queue, one will be started, using
     * the coroutineContext of the caller.
     *
     * It's safe to call this method from any thread/coroutine.
     */
    suspend fun enqueue(op: Op)

    /**
     * Enqueue the provided block, and then waits for the queue to run it and return a result,
     * which is then returned from this method.
     */
    suspend fun <T> enqueueAndWait(block: suspend () -> T): T {
        val result = CompletableDeferred<T>()
        enqueue {
            result.complete(block())
        }
        return result.await()
    }

    /** This method suspends until all operations have finished. */
    suspend fun idle()
}
