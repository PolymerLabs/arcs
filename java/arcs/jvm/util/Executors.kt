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

package arcs.jvm.util

import java.util.concurrent.ExecutorService
import java.util.concurrent.SynchronousQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

/** Collection of Arcs JVM executors. */
object Executors {

    /**
     * per-arc-per-archost single-threaded
     * Each of them is managed directly by JvmSchedulerProvider.
     * Can be quickly overridden as single-threaded pattern:
     *     iterator { while (true) yield(someExecutor) }
     */
    var schedulers: Iterator<ExecutorService>? = null

    /**
     * i/o (dynamic-sizing thread pool)
     * on WAL, three dbs: main, wal and wal-index
     */
    var io: ExecutorService = ThreadPoolExecutor(
        0, 2, 10L, TimeUnit.SECONDS, SynchronousQueue()
    ) { runnable -> Thread(runnable).apply { name = "arcs-io #$id" } }
}
