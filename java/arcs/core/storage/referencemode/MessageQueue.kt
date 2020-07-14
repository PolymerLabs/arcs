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

import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Thread-safe queue of [Message]s intended for the [arcs.storage.ReferenceModeStore] to process.
 *
 * It's important that [Message]s are always processed in the order in which they were received.
 */
class MessageQueue(
    private val onProxyMessage: suspend (Message.EnqueuedFromStorageProxy) -> Boolean,
    private val onContainerStoreMessage: suspend (Message.EnqueuedFromContainer) -> Boolean,
    private val onBackingStoreMessage: suspend (Message.EnqueuedFromBackingStore) -> Boolean,
    private val onMessageQueueEmpty: suspend () -> Unit = {}
) {

    private sealed class QueueEntry {
        class MessageEntry(val message: Message) : QueueEntry()
        object Flush : QueueEntry()
    }

    private val mutex = Mutex()
    private val queue = mutableListOf<QueueEntry>()

    /**
     * Enqueues an incoming [Message] onto the queue and awaits the return value of processing that
     * [Message].
     */
    @ExperimentalCoroutinesApi
    suspend fun enqueue(message: Message): Boolean {
        require(message !is Message.Enqueued) { "Cannot enqueue an already-enqueued message." }
        val deferred = CompletableDeferred<Boolean>(coroutineContext[Job.Key])
        mutex.withLock { queue += QueueEntry.MessageEntry(message.toEnqueued(deferred)) }
        CoroutineScope(coroutineContext).launch { drainQueue() }
        return deferred.await()
    }

    private suspend fun drainQueue() {
        val messagesToProcess = mutex.withLock {
            mutableListOf<QueueEntry>().also {
                it.addAll(queue)
                queue.clear()
            }
        }

        messagesToProcess.forEach {
            when (it) {
                is QueueEntry.MessageEntry -> processMessage(it.message)
                is QueueEntry.Flush -> Unit
            }
        }

        mutex.withLock {
            if (queue.isEmpty()) {
                onMessageQueueEmpty()
            }
        }
    }

    /**
     * Posts a message on the queue, and returns a [Job] this will be completed when the queue
     * arrives at this message. This allows you to wait for all *current* pending messages to
     * be processed.
     */
    suspend fun flush(): Job {
        val job = Job(coroutineContext[Job.Key])
        mutex.withLock { queue += QueueEntry.Flush }
        CoroutineScope(coroutineContext).launch {
            drainQueue()
            job.complete()
        }
        return job
    }

    private suspend fun processMessage(message: Message): Boolean = when (message) {
        is Message.EnqueuedFromStorageProxy ->
            onProxyMessage(message).also { message.deferred.complete(it) }
        is Message.EnqueuedFromBackingStore ->
            onBackingStoreMessage(message).also { message.deferred.complete(it) }
        is Message.EnqueuedFromContainer ->
            onContainerStoreMessage(message).also { message.deferred.complete(it) }
        else -> false
    }
}
