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

import arcs.core.util.TaggedLog
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.ExecutorService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * A special [WriteBack] implementation for unit tests.
 *
 * Specifically it accepts scope/dispatcher being overwritten which is required
 * at unit tests that are run by runBlockingTest. Furthermore, cross-stores idle
 * awaiting and logging are supported.
 */
class WriteBackForTesting private constructor(
    protocol: String
) : WriteBack,
    Channel<suspend () -> Unit> by Channel(10),
    Mutex by Mutex() {
    private val passThrough = protocol != "db"
    private var activeJobs = 0
    private val awaitSignal = Mutex()

    init {
        track(this)
        if (!passThrough) {
            writeBackScope?.launch {
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
        if (!passThrough && writeBackScope != null) enterFlushSection { send(job) }
        else job()
    }

    override suspend fun awaitIdle() = awaitSignal.withLock {}

    private suspend inline fun flushSection(job: () -> Unit) {
        enterFlushSection()
        job()
        exitFlushSection()
    }

    private suspend inline fun enterFlushSection(job: () -> Unit = {}) {
        withLock {
            if (++activeJobs == 1) awaitSignal.lock()
            log.debug { "activeJobs: $activeJobs, isLocked: ${awaitSignal.isLocked}" }
        }
        job()
    }

    private suspend inline fun exitFlushSection(job: () -> Unit = {}) {
        job()
        withLock {
            if (--activeJobs == 0) awaitSignal.unlock()
            log.debug { "activeJobs: $activeJobs, isLocked: ${awaitSignal.isLocked}" }
        }
    }

    companion object : WriteBackFactory {
        /**
         * To get around the known runBlockingTest issue:
         * java.lang.IllegalStateException: This job has not completed yet
         * the scope should be overwritten by test classes' [TestCoroutineScope]
         * instances.
         *
         * Reference:
         * https://medium.com/@eyalg/testing-androidx-room-kotlin-coroutines-2d1faa3e674f
         */
        var writeBackScope: CoroutineScope? = null

        private var instances = CopyOnWriteArrayList<WriteBackForTesting>()
        private val log = TaggedLog(::toString)

        /** Track [WriteBack] instances. */
        private fun track(instance: WriteBackForTesting) = instances.add(instance)

        /** Clear all created write-back instances after test iteration(s). */
        fun clear() {
            instances.clear()
        }

        /** Await completion of the flush jobs of all created [WriteBack] instances. */
        fun awaitAllIdle() = runBlocking {
            for (instance in instances) instance.awaitIdle()
            log.debug { "passed awaitAllIdle()" }
        }

        override fun create(
            protocol: String,
            writebackThreads: ExecutorService?,
            queueSize: Int
        ) = WriteBackForTesting(protocol)
    }
}
