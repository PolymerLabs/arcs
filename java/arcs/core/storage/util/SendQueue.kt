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

import arcs.core.common.ReferenceId
import arcs.core.crdt.VersionMap
import arcs.core.storage.Reference
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Thread-safe queue to manage and dispatch sending events, where said dispatching may depend on
 * waiting for a hold in a [HoldQueue] to be released.
 */
class SendQueue(
    /** Whether or not to initiate a queue drain after each [enqueue]/[enqueueBlocking]. */
    private val drainOnEnqueue: Boolean = true
) {
    /** Lock used to gate concurrent access to the [queue], [holdQueue], and [currentBlock]. */
    private val mutex = Mutex()
    /** A queue of [PendingSend]s. May be blocked on entities becoming available. */
    private var queue = mutableListOf<PendingSend>()
    /** A queue of blocks to the [queue]. */
    private val holdQueue = HoldQueue()
    /** An incrementing ID to uniquely identify each blocked send. */
    private var currentBlock: Int = 0

    /** Enqueues a sending function on the send queue. */
    suspend fun enqueue(runnable: suspend () -> Unit) {
        mutex.withLock {
            queue.add(PendingSend.NonBlocking(runnable))
        }

        // Outside of the lock, we can attempt a drain.
        if (drainOnEnqueue) drain()
    }

    /**
     * Enqueues a send function on the send queue, blocking on its execution until the provided
     * [references] are all available in the [backingStore].
     */
    suspend fun enqueueBlocking(references: List<Reference>, runnable: suspend () -> Unit) {
        mutex.withLock {
            val block = "${currentBlock++}"
            queue.add(PendingSend.Blocking(block, runnable))
            holdQueue.enqueue(references.map { HoldQueue.Entity(it.id, it.version.copy()) }) {
                drain(block)
            }
        }

        // Additionally, we can drain any non-blocked items.
        if (drainOnEnqueue) drain()
    }

    /**
     * Processes any [PendingSend]s in the pending [queue], including sends blocked on the
     * provided [block].
     *
     * This should only be called by the [holdQueue].
     */
    suspend fun drain(block: String? = null) {
        val toProcess = mutableListOf<PendingSend>()
        mutex.withLock {
            val newSendQueue = mutableListOf<PendingSend>()
            queue.forEach {
                when (it) {
                    is PendingSend.NonBlocking -> toProcess.add(it)
                    is PendingSend.Blocking ->
                        if (it.block == block) toProcess.add(it) else newSendQueue.add(it)
                }
            }
            queue = newSendQueue
        }
        // Process our sends outside of the mutex so we don't get a deadlock if a send triggers
        // another enqueue.
        toProcess.forEach { it() }
    }

    /**
     * Processes the [holdQueue] for the given [ReferenceId] at the specified [version], possibly
     * releasing some of its hold(s).
     */
    suspend fun notifyReferenceHold(id: ReferenceId, version: VersionMap) =
        holdQueue.processReferenceId(id, version)

    /** Utility to get the queued runnables from tests. */
    /* internal */ suspend fun getQueueRunnables(): List<suspend () -> Unit> =
        mutex.withLock { queue.map { it.fn } }

    /** Wrapper for a suspending function which is used as an item in a [SendQueue]. */
    private sealed class PendingSend(open val fn: suspend () -> Unit) {
        /** Makes a [PendingSend] behave as if it were itself a suspending function. */
        suspend operator fun invoke() = fn()

        /** A [PendingSend] that can be issued regardless of the current block. */
        data class NonBlocking(override val fn: suspend () -> Unit) : PendingSend(fn)

        /**
         * Denotes a [PendingSend] which should not be executed until a certain [block] is recieved.
         */
        data class Blocking(
            val block: String,
            override val fn: suspend () -> Unit
        ) : PendingSend(fn)
    }
}
