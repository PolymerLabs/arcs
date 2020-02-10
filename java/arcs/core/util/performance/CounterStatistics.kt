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

/**
 * Accumulator of [RunningStatistics] about a collection of [Counters].
 *
 * **Note:** Not thread-safe.
 */
class CounterStatistics private constructor(
    private val statistics: Map<String, RunningStatistics>
) {
    /** Creates a [CounterStatistics] object for the given [counterNames]. */
    constructor(vararg counterNames: String) : this(counterNames.toSet())

    /** Creates a [CounterStatistics] object for the given [counterNames]. */
    constructor(counterNames: Set<String>) :
        this(counterNames.associateWith { RunningStatistics() })

    /** Creates a [CounterStatistics] object based on a previous [Snapshot]. */
    constructor(previous: Snapshot) :
        this(previous.statistics.mapValues { RunningStatistics(it.value) })

    /** Creates a new [Counters] object for this [CounterStatistics]' counter names. */
    fun createCounters(): Counters = Counters(statistics.keys)

    /** Absorbs the provided [newCounts] [Counters] into the [CounterStatistics]. */
    fun append(newCounts: Counters) {
        statistics.forEach { (key, stats) -> stats.logStat(newCounts[key].toDouble()) }
    }

    /** Takes a snapshot of the current [RunningStatistics] for each counter. */
    fun snapshot(): Snapshot = Snapshot(statistics.mapValues { it.value.snapshot() })

    /** Frozen snapshot of [CounterStatistics]. */
    data class Snapshot(val statistics: Map<String, RunningStatistics.Snapshot>) {
        /** Names of the registered counters. */
        val counterNames = statistics.keys

        /** Creates a new/empty [Snapshot] for the provided [counterNames]. */
        constructor(counterNames: Set<String>) :
            this(counterNames.associateWith { RunningStatistics.Snapshot() })

        /**
         * Returns a [Snapshot] with the current [RunningStatistics.Snapshot] values for names
         * within [counterNames], and new/empty values for names not found within this snapshot.
         *
         * **Note:**
         * For counters with names not in [counterNames], their statistics will be dropped.
         */
        fun withNames(counterNames: Set<String>): Snapshot {
            val newStats = mutableMapOf<String, RunningStatistics.Snapshot>()
            counterNames.forEach {
                newStats[it] = statistics[it] ?: RunningStatistics.Snapshot()
            }
            return Snapshot(newStats)
        }

        operator fun get(counterName: String): RunningStatistics.Snapshot =
            requireNotNull(statistics[counterName]) {
                "Counter with name \"$counterName\" not registered"
            }
    }
}
