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

package arcs.core.storage.referencemode

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.VersionMap
import arcs.core.storage.ProxyMessage
import arcs.core.storage.referencemode.Message.PreEnqueuedFromBackingStore
import arcs.core.storage.referencemode.Message.PreEnqueuedFromContainer
import arcs.core.storage.referencemode.Message.PreEnqueuedFromStorageProxy
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.ConcurrentLinkedDeque
import java.util.concurrent.Executors
import kotlin.random.Random
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CompletableJob
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for the [MessageQueue]. */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class MessageQueueTest {
    private val random = Random(System.currentTimeMillis())
    private val dispatcher = Executors.newFixedThreadPool(100).asCoroutineDispatcher()

    @Test
    fun enqueueingConcurrently_dequeueInOrder() = runBlocking(dispatcher) {
        val dequeuedIds = ConcurrentLinkedDeque<Int>()
        val expected = ConcurrentLinkedDeque<Int>()
        val queue = MessageQueue(
            makeCallback(dequeuedIds),
            makeCallback(dequeuedIds),
            makeCallback(dequeuedIds)
        )

        val nextId = atomic(0)
        val jobs = 0.until(100).map {
            launch {
                // Thread.sleep doesn't suspend, so we're sure to be forcing stuff onto other
                // threads.
                Thread.sleep(random.nextLong(10, 1000))
                val id = nextId.getAndIncrement()
                expected.add(it)
                queue.enqueue(
                    makePreEnqueuedFrom(
                        id,
                        Message.UpdateSource.values()[random.nextInt(0, 3)]
                    )
                )
                Thread.sleep(random.nextLong(10, 1000))
            }
        }
        jobs.joinAll()

        assertThat(dequeuedIds).containsExactly(*expected.toTypedArray())
        Unit
    }

    /** Guarantees that any callbacks which trigger new messages don't get called out-of-order. */
    @Test
    fun inceptionLevels_processInOrder() = runBlocking(dispatcher) {
        val calledCallbacks = ConcurrentLinkedDeque<Int>()
        val completeSignal = Job()
        val inceptionLevels = 7

        lateinit var queue: MessageQueue
        queue = MessageQueue(
            makeCallbackGeneratingMessages(
                inceptionLevels,
                { queue },
                calledCallbacks,
                completeSignal
            ),
            // These callbacks won't be called, so, it's no thang to pass a new deque.
            makeCallback(ConcurrentLinkedDeque()),
            makeCallback(ConcurrentLinkedDeque())
        )

        queue.enqueue(makePreEnqueuedFrom(0, Message.UpdateSource.StorageProxy))

        // Wait until all callbacks have been called.
        completeSignal.join()

        assertThat(calledCallbacks).containsExactly(*(1..7).toList().toTypedArray())
        Unit
    }

    /**
     * Generates a callback that generates [inceptionLevel]-more messages, one each time it's
     * called.
     *
     * This simulates the situation where a ProxyMessage comes into the
     * [arcs.storage.ReferenceModeStore], it does some messaging to the backing and container
     * stores, and they message back.
     */
    @Suppress("SameParameterValue")
    private fun makeCallbackGeneratingMessages(
        inceptionLevel: Int,
        messageQueue: () -> MessageQueue,
        receiver: ConcurrentLinkedDeque<Int>,
        completeSignal: CompletableJob
    ): suspend (Message.EnqueuedFromStorageProxy) -> Boolean = {
        val messageId = requireNotNull(it.message.id) + 1
        receiver.add(messageId)
        Thread.sleep(random.nextLong(10, 100))
        if (messageId < inceptionLevel) {
            // We need to go deeper.
            CoroutineScope(dispatcher).launch {
                Thread.sleep(random.nextLong(10, 100))
                messageQueue().enqueue(
                    makePreEnqueuedFrom(messageId, Message.UpdateSource.StorageProxy)
                )
            }
        } else {
            // This is the last callback, it's like the creepy Limbo level in the movie.
            // Time for the *kick*.
            completeSignal.complete()
        }
        true
    }

    /**
     * Makes a simple callback which adds the message ID its given to the [receiver] for call-order
     * test verification.
     */
    private fun <T : Message> makeCallback(
        receiver: ConcurrentLinkedDeque<Int>
    ): suspend (T) -> Boolean = { receiver.add(it.message.id) }

    private fun makePreEnqueuedFrom(id: Int, type: Message.UpdateSource): Message = when (type) {
        Message.UpdateSource.Container -> PreEnqueuedFromContainer(makeMessage(id))
        Message.UpdateSource.BackingStore -> PreEnqueuedFromBackingStore(makeMessage(id), "$id")
        Message.UpdateSource.StorageProxy -> PreEnqueuedFromStorageProxy(makeProxyMessage(id))
    }

    private fun makeMessage(
        id: Int
    ): ProxyMessage<CrdtData, CrdtOperationAtTime, Referencable> =
        ProxyMessage.ModelUpdate(DummyData(), id = id)

    private fun makeProxyMessage(
        id: Int
    ): ProxyMessage<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput> =
        ProxyMessage.ModelUpdate(RefModeStoreData.Set(VersionMap(), mutableMapOf()), id = id)

    private data class DummyData(override var versionMap: VersionMap = VersionMap()) : CrdtData
}
