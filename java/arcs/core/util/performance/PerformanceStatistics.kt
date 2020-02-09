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

package arcs.core.util.performance

import arcs.core.util.RunningStatistics
import arcs.core.util.guardWith
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.coroutines.CoroutineContext

/**
 * Utility for tracking running performance/runtime statistics of arbitrary operations.
 *
 * Example usage:
 *
 * ```kotlin
 * object FibonacciCalculator {
 *     private val fiboSlowStats =
 *         PerformanceStatistics(PlatformTimer, "additions", "recursiveCalls")
 *     private val fiboFastStats =
 *         PerformanceStatistics(PlatformTimer, "additions", "loops")
 *
 *     fun fiboSlow(n: Int): Int = fiboSlowStats.time { counters ->
 *         fun inner(n: Int): Int {
 *             if (n == 0 || n == 1) return 1
 *
 *             counters.increment("recursiveCalls")
 *             val nMinus2 = inner(n - 2)
 *             counters.increment("recursiveCalls")
 *             val nMinus1 = inner(n - 1)
 *
 *             counters.increment("additions")
 *             return nMinus2 + nMinus1
 *         }
 *
 *         return@time inner(n)
 *     }
 *
 *     fun fiboFast(n: Int): Int = fiboFastStats.time { counters ->
 *         var nMinus2 = 0
 *         var nMinus1 = 1
 *
 *         repeat(n) {
 *             counters.increment("loops")
 *             counters.increment("additions")
 *             val sum = nMinus1 + nMinus2
 *             nMinus2 = nMinus1
 *             nMinus1 = sum
 *         }
 *
 *         return@time nMinus1
 *     }
 *
 *     suspend fun printStats() {
 *         val fiboSlowSnapshot = fiboSlowStats.snapshot()
 *         println("Slow stats:")
 *         println(fiboSlowSnapshot)
 *
 *         val fiboFastSnapshot = fiboFastStats.snapshot()
 *         println("Fast stats:")
 *         println(fiboFastSnapshot)
 *     }
 * }
 * ```
 */
class PerformanceStatistics private constructor(
    private val timer: Timer,
    private val counterNames: Set<String>,
    initialStats: Snapshot = Snapshot(counterNames)
) {
    private val mutex = Mutex()
    private val runtimeStats by guardWith(mutex, RunningStatistics(initialStats.runtimeStatistics))
    private val counters by guardWith(mutex, CounterStatistics(initialStats.countStatistics))

    /**
     * Creates a [PerformanceStatistics] object.
     *
     * @param requiredCounterNames required counters for the new [PerformanceStatistics].
     */
    constructor(
        timer: Timer,
        vararg requiredCounterNames: String
    ) : this(
        timer,
        requiredCounterNames.toSet(),
        Snapshot(
            RunningStatistics.Snapshot(),
            CounterStatistics.Snapshot(requiredCounterNames.toSet())
        )
    )

    /**
     * Creates a [PerformanceStatistics] object.
     *
     * @param initialStats statistics from previous usage as a starting point for the created
     *     object.
     * @param requiredCounterNames required counters for the new [PerformanceStatistics]. Counter
     *     names from the previous snapshots not found in [requiredCounterNames] will be dropped,
     *     new names will be initialized with new/empty statistics.
     */
    constructor(
        timer: Timer,
        initialStats: Snapshot,
        vararg requiredCounterNames: String
    ) : this(
        timer,
        requiredCounterNames.toSet(),
        initialStats
    )

    /** Takes a [Snapshot] of the current performance statistics. */
    suspend fun snapshot(): Snapshot = mutex.withLock {
        Snapshot(runtimeStats.snapshot(), counters.snapshot())
    }

    /** Asynchronously takes a [Snapshot] of the current performance statistics. */
    fun snapshotAsync(
        coroutineContext: CoroutineContext = Dispatchers.Default
    ): Deferred<Snapshot> = CoroutineScope(coroutineContext).async { snapshot() }

    /**
     * Records the execution duration of the given [block].
     *
     * The [block] can use the provided [Counters] to track individual named-operations,
     * accumulating statistics for the numbers of those invocations.
     */
    fun <Calculated> time(block: (Counters) -> Calculated): Calculated {
        val (timedResult, elapsed) = timer.time {
            val counts = Counters(counterNames)
            block(counts) to counts
        }
        val (result, counts) = timedResult

        CoroutineScope(Dispatchers.Default).launch {
            mutex.withLock {
                runtimeStats.logStat(elapsed.toDouble())
                counters.append(counts)
            }
        }

        return result
    }

    /**
     * Records the execution duration of the given suspending [block].
     *
     * The [block] can use the provided [Counters] to track individual named-operations,
     * accumulating statistics for the numbers of those invocations.
     */
    suspend fun <Calculated> timeSuspending(block: suspend (Counters) -> Calculated): Calculated {
        val (timedResult, elapsed) = timer.timeSuspending {
            val counts = Counters(counterNames)
            block(counts) to counts
        }
        val (result, counts) = timedResult

        mutex.withLock {
            runtimeStats.logStat(elapsed.toDouble())
            counters.append(counts)
        }

        return result
    }

    /** Frozen snapshot of [PerformanceStatistics]. */
    data class Snapshot(
        val runtimeStatistics: RunningStatistics.Snapshot,
        val countStatistics: CounterStatistics.Snapshot
    ) {
        /**
         * Creates an empty [Snapshot] with a [CounterStatistics.Snapshot] value for the given
         * [counterNames].
         */
        constructor(counterNames: Set<String>) :
            this(RunningStatistics.Snapshot(), CounterStatistics.Snapshot(counterNames))
    }
}
