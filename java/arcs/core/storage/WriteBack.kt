/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage

import arcs.core.storage.keys.Protocols
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.consumeEach
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onCompletion
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * A layer to decouple local data updates and underlying storage layers flushes.
 *
 * The modern storage stacks including VFS page dirty write-back, io-scheduler
 * merging and re-ordering, flash device turbo-write and/or buffer flush, etc
 * are all implemented in an efficient way where no data/metadata is written
 * through to storage media for every single write operation unless explicitly
 * being requested.
 */
interface WriteBack {
    /**
     * Write-through: flush directly all data updates to the next storage layer.
     */
    suspend fun flush(job: suspend () -> Unit)
    /**
     * Write-back: queue up data updates and let write-back threads decide how and
     * when to flush all data updates to the next storage layer.
     */
    suspend fun asyncFlush(job: suspend () -> Unit)

    /** Await completion of all active flush jobs. */
    suspend fun awaitIdle()
}

/** The factory interfaces of [WriteBack] implementations. */
interface WriteBackFactory {
    fun create(
        /** One of supported storage [Protocols]. */
        protocol: String = "",
        /** The maximum queue size above which new incoming flush jobs will be suspended. */
        queueSize: Int = Channel.UNLIMITED
    ): WriteBack
}

/**
 * Write-back implementation for Arcs Stores.
 * It implements [Mutex] that provides the capability of temporary lock-down and resume.
 */
@ExperimentalCoroutinesApi
class StoreWriteBack private constructor(
    protocol: String,
    queueSize: Int,
    val scope: CoroutineScope?
) : WriteBack,
    Mutex by Mutex() {
    // Only apply write-back to physical storage media(s).
    private val passThrough = atomic(
        scope == null || protocol != Protocols.DATABASE_DRIVER
    )

    // The number of active flush jobs.
    private var activeJobs = 0

    // The signal to block/release who are waiting for completion of active flush jobs.
    private val awaitSignal = Mutex()

    // Internal asynchronous write-back channel for scheduling flush jobs.
    private val channel: Channel<suspend () -> Unit> = Channel(queueSize)

    init {
        // One of write-back thread(s) will wake up and execute flush jobs in FIFO order
        // when there are pending flush jobs in queue. Powerful features like batching,
        // merging, filtering, etc can be implemented at this call-site in the future.
        if (!passThrough.value && scope != null) {
            channel.consumeAsFlow()
                .onEach {
                    // Neither black out pending flush jobs in this channel nor propagate
                    // the exception within the scope to affect flush jobs at other stores.
                    try { it() } catch (_: Exception) {}
                }
                .onCompletion {
                    // Upon cancellation of the write-back scope, change to write-through mode,
                    // consume all pending flush jobs then release all awaitings.
                    passThrough.update { true }
                    channel.consumeEach {
                        exitFlushSection { try { it() } catch (_: Exception) {} }
                    }
                    if (awaitSignal.isLocked) awaitSignal.unlock()
                }
                .launchIn(scope)
        }
    }

    override suspend fun flush(job: suspend () -> Unit) {
        if (!passThrough.value) flushSection { job() }
        else job()
    }

    override suspend fun asyncFlush(job: suspend () -> Unit) {
        if (!passThrough.value) enterFlushSection {
            // Queue up a flush task can run average 3x-5x faster than launching it.
            // Fall back to write-through when the write-back channel is cancelled or closed.
            try { channel.send(job) } catch (_: Exception) { exitFlushSection { job() } }
        } else job()
    }

    override suspend fun awaitIdle() = awaitSignal.withLock {}

    private suspend inline fun flushSection(job: () -> Unit) {
        enterFlushSection()
        job()
        exitFlushSection()
    }

    private suspend inline fun enterFlushSection(job: () -> Unit = {}) {
        withLock { if (++activeJobs == 1) awaitSignal.lock() }
        job()
    }

    private suspend inline fun exitFlushSection(job: () -> Unit = {}) {
        job()
        withLock { if (--activeJobs == 0) awaitSignal.unlock() }
    }

    companion object : WriteBackFactory {
        private var writeBackScope: CoroutineScope? = null

        /** Override [WriteBack] injection to Arcs Stores. */
        var writeBackFactoryOverride: WriteBackFactory? = null

        /** The factory of creating [WriteBack] instances. */
        override fun create(protocol: String, queueSize: Int) =
            writeBackFactoryOverride?.create(protocol, queueSize)
                ?: StoreWriteBack(protocol, queueSize, writeBackScope)

        /**
         * Initialize write-back coroutine scope.
         * The caller is responsible for managing lifecycle of the [scope].
         * The cancellation of the [scope] will switch the write-back to write-through.
         */
        fun init(scope: CoroutineScope) { writeBackScope = scope }
    }
}
