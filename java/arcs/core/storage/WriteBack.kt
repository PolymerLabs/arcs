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

import androidx.annotation.VisibleForTesting
import java.util.concurrent.ExecutorService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * A layer to decouple local data updates and underlying storage layers write-back.
 *
 * The modern storage stacks including VFS page dirty write-back, underlying flash drivers
 * batched-write/flush, etc are all implemented in an efficient way where no data/metadata is
 * written through to the storage media for every single write operation unless being requested.
 */
interface WriteBack {
    /**
     * Write-through: block current thread to flush all data updates to the next storage layer.
     */
    suspend fun flush(job: suspend () -> Unit)
    /**
     * Write-back: queue up data updates and let write-back threads decide how and when to
     * flush all data updates to the next storage layer.
     */
    suspend fun asyncFlush(job: suspend () -> Unit)

    /** Await completion of all active flush jobs. */
    suspend fun awaitIdle()
}

/** The factory interfaces of [WriteBack] implementations. */
interface WriteBackFactory {
    fun create(
        protocol: String = "",
        /**
         * Provide a dedicated write-back thread pool, otherwise just use kotlin I/O dispatchers.
         */
        writebackThreads: ExecutorService? = null,
        /**
         * The maximum queue size above which new incoming flush jobs will be suspended.
         */
        queueSize: Int = 10
    ): WriteBack
}

/** Write-back implementation for Arcs Stores.*/
class StoreWriteBack private constructor(
    protocol: String,
    writebackThreads: ExecutorService?,
    queueSize: Int
) : WriteBack,
    Channel<suspend () -> Unit> by Channel(queueSize),
    CoroutineScope by CoroutineScope(
        writebackThreads?.asCoroutineDispatcher() ?: Dispatchers.IO
    ),
    Mutex by Mutex() {
    // Only apply write-back to physical storage medias.
    private val passThrough = protocol != "db"

    // The number of active flush jobs.
    private var activeJobs = 0

    // The signal to block/release who are waiting for completion of active flush jobs.
    private val awaitSignal = Mutex()

    init {
        // One of write-back thread(s) will wake up and execute flush jobs in FIFO order
        // when there are pending flush jobs in queue. Powerful features like batching,
        // merging, filtering, etc can be implemented at this call-site in the future.
        if (!passThrough) {
            launch {
                try {
                    while (true) {
                        exitFlushSection { receive()() }
                    }
                } finally {
                    if (awaitSignal.isLocked) {
                        awaitSignal.unlock()
                    }
                }
            }
        }
    }

    override suspend fun flush(job: suspend () -> Unit) {
        if (!passThrough) flushSection { job() }
        else job()
    }

    override suspend fun asyncFlush(job: suspend () -> Unit) {
        // Queue up a flush task can run average 3x-5x faster than launching it.
        if (!passThrough) enterFlushSection { send(job) }
        else job()
    }

    override suspend fun awaitIdle() {
        if (!passThrough) awaitSignal.withLock {}
    }

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
        @VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
        var writeBackFactoryOverride: WriteBackFactory? = null

        /** The factory of creating [StoreWriteBack] instances. */
        override fun create(protocol: String, writebackThreads: ExecutorService?, queueSize: Int) =
            writeBackFactoryOverride?.create(protocol, writebackThreads, queueSize)
                ?: StoreWriteBack(protocol, writebackThreads, queueSize)
    }
}
