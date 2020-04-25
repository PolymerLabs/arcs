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

package arcs.core.storage

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.consumeEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

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
}

/** Write-back implementation for Arcs Stores.*/
class StoreWriteBack(
    private val protocol: String = "",
    /**
     * Provide a dedicated write-back thread pool, otherwise just use kotlin I/O dispatchers.
     */
    private val writebackThreads: ExecutorService? = null,
    /**
     * The maximum queue size above which new incoming flush jobs will be suspended.
     */
    private val queueSize: Int = 10
) : WriteBack,
    Channel<suspend () -> Unit> by Channel(queueSize),
    CoroutineScope by CoroutineScope(
        writebackThreads?.asCoroutineDispatcher() ?: Dispatchers.IO
    ),
    Mutex by Mutex()
{
    // Only apply write-back to physical storage medias.
    private val passThrough = protocol != "db"

    init {
        // One of write-back thread(s) will wake up and execute flush jobs in FIFO order
        // when there are pending flush jobs in queue. Powerful features like batching,
        // merging, filtering, etc can be implemented at this call-site in the future.
        if (!passThrough) {
            launch { consumeEach { it() } }
        }
    }

    override suspend fun flush(job: suspend () -> Unit) {
        if (!passThrough) withLock { job() }
        else job()
    }

    override suspend fun asyncFlush(job: suspend () -> Unit) {
        // Queue up a flush task can run 3x-5x faster than launching it.
        if (!passThrough) send(job)
        else job()
    }
}
