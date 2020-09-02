package arcs.core.storage.util

import com.google.common.truth.Truth.assertThat
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.test.runBlockingTest
import kotlinx.coroutines.withTimeout
import org.junit.Test

@ExperimentalCoroutinesApi
class SimpleQueueTest {
    @Test
    fun enqueueSingleJob() = runBlockingTest {
        val queue = SimpleQueue()
        val deferred = CompletableDeferred<Unit>()
        queue.enqueue {
            deferred.complete(Unit)
        }
        withTimeout(5000) {
            deferred.await()
        }
    }

    @Test
    fun enqueueSingleJobAndWait() = runBlockingTest {
        val queue = SimpleQueue()
        var ran = false
        withTimeout(5000) {
            queue.enqueueAndWait { ran = true }
        }
        assertThat(ran).isTrue()
    }

    @Test
    fun onEmptyIsCalled() = runBlockingTest {
        val deferred = CompletableDeferred<Unit>()
        val queue = SimpleQueue(
            onEmpty = {
                deferred.complete(Unit)
            }
        )
        queue.enqueue { }

        withTimeout(5000) {
            deferred.await()
        }
    }

    @Test
    fun enqueueSerialized() = runBlockingTest {
        val active = atomic(0)
        val ran = atomic(0)
        val deferred = CompletableDeferred<Unit>()
        val queue = SimpleQueue(
            onEmpty = {
                assertThat(active.incrementAndGet()).isEqualTo(1)
                active.decrementAndGet()
                deferred.complete(Unit)
            }
        )

        val jobCount = 1000
        repeat(jobCount) {
            queue.enqueue {
                assertThat(active.incrementAndGet()).isEqualTo(1)
                suspendCancellableCoroutine<Unit> { it.resume(Unit) {} }
                active.decrementAndGet()
                ran.incrementAndGet()
            }
        }
        deferred.await()
        assertThat(ran.value).isEqualTo(jobCount)
    }
}
