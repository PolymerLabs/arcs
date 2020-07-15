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

package arcs.android.systemhealth.testapp

import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/** Collection of Arcs JVM executors. */
object Executors {
    /**
     * A [Scheduler] is per-arc-per-archost single-threaded.
     * Each of them is managed directly by the [JvmSchedulerProvider] on JVM builds.
     * Can be overridden as the globally-single-threaded design by:
     *     iterator { while (true) yield(someExecutor) }
     */
    var schedulers: Iterator<ExecutorService>? = null

    /**
     * I/O (dynamic-sizing thread pool)
     * On Arcs there are two sorts of databases: data and metadata.
     * On sqlite WAL there are three databases: main journal, wal and wal-index.
     *
     * Recommending taking max size two as default as
     * one can be updating metadata and another one is writing data, i.e.
     * ThreadPoolExecutor(0, 2, 10L, TimeUnit.SECONDS, ...)
     */
    var io: ExecutorService = Executors.newCachedThreadPool {
        Thread(it).apply { name = "arcs-io" }
    }
}
