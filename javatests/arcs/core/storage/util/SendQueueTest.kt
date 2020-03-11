/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage.util

import arcs.core.crdt.VersionMap
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.Reference
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.Executors
import kotlin.random.Random
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.delay
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [SendQueue]. */
@Suppress("RedundantSuspendModifier")
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class SendQueueTest {
    private val threadPoolDispatcher = Executors.newFixedThreadPool(100).asCoroutineDispatcher()
    private val random = Random.Default

    @Test
    fun enqueueConcurrently_enqueuedOrderIsCorrect() = runBlocking(threadPoolDispatcher) {
        // This test method uses a thread pool dispatcher to ensure that we're actually enqueuing on
        // different threads.

        val sendQueue = SendQueue(drainOnEnqueue = false)
        val receiversInOrder = ConcurrentLinkedQueue<suspend () -> Unit>()

        fun buildReceiver(): suspend () -> Unit {
            val receiver = suspend {}
            receiversInOrder.add(receiver)
            return receiver
        }

        // Enqueue 200 receivers by launching 200 coroutines which each have a random delay,
        // ensuring that they're executing concurrently.
        0.until(200).map {
            launch {
                // Use Thread.sleep so we don't suspend the coroutine, but still delay it - further
                // ensuring we're running the enqueues concurrently.
                Thread.sleep(random.nextLong(0, 1000))
                sendQueue.enqueue(buildReceiver())
            }
        }.joinAll()

        // In whatever order they were enqueued, they should exist in the queue in that order.
        assertThat(sendQueue.getQueueRunnables()).containsExactlyElementsIn(receiversInOrder)
        Unit
    }

    @Test
    fun enqueueLongRunning_drainInOrder() = runBlockingTest {
        val sendQueue = SendQueue()
        val received = ConcurrentLinkedQueue<Int>()

        // Returns a receiver suspending function for the SendQueue which adds the given number
        // to the received ConcurrentLinkedQueue.
        fun buildReceiver(num: Int): suspend () -> Unit = {
            delay(random.nextLong(0, 1000))
            runCurrent()
            received.add(num)
        }

        // Enqueue 2000 receivers.
        repeat(2000) { sendQueue.enqueue(buildReceiver(it)) }

        // They should be drained in-order.
        assertThat(received.toList()).isEqualTo(0.until(2000).toList())
    }

    @Test
    fun enqueueWhichCausesEnqueue_doesntDeadlock() = runBlocking(threadPoolDispatcher) {
        // This test method uses a thread pool dispatcher to ensure that we're actually enqueuing on
        // different threads.

        val sendQueue = SendQueue()
        val enqueuedRan = atomic(false)
        val enqueuingRan = atomic(false)

        suspend fun enqueued() {
            enqueuedRan.value = true
        }

        suspend fun enqueueing() {
            sendQueue.enqueue(::enqueued)
            // Use Thread.sleep so we don't suspend the coroutine, but still delay it.
            Thread.sleep(random.nextLong(500, 1000))
            enqueuingRan.value = true
        }

        sendQueue.enqueue(::enqueueing)
        sendQueue.drain() // just to make sure it's all been drained.
        assertThat(enqueuedRan.value).isTrue()
        assertThat(enqueuingRan.value).isTrue()
    }

    @Test
    fun enqueueBlocking_doesntDrainUntilBlockIsReleased() = runBlockingTest {
        val sendQueue = SendQueue()
        val blockingCalled = atomic(false)

        suspend fun blockingSend() {
            blockingCalled.value = true
        }

        val references = listOf(
            Reference("foo", RamDiskStorageKey("foo"), VersionMap("me" to 1)),
            Reference("bar", RamDiskStorageKey("bar"), VersionMap("me" to 1))
        )

        sendQueue.enqueueBlocking(references, ::blockingSend)
        sendQueue.drain()
        assertThat(blockingCalled.value).isFalse()

        sendQueue.drain("invalidBlock")
        assertThat(blockingCalled.value).isFalse()

        sendQueue.notifyReferenceHold("bar", VersionMap("me" to 1))
        assertThat(blockingCalled.value).isFalse()

        // Should finally be released once all of the references have been notified-about.
        sendQueue.notifyReferenceHold("foo", VersionMap("me" to 2))
        assertThat(blockingCalled.value).isTrue()
    }
}
