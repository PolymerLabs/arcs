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

package arcs.core.storage.database

import arcs.core.util.performance.PerformanceStatistics

/** Wrapper for [PerformanceStatistics] by operation type on [Database] instances. */
class DatabasePerformanceStatistics(
    /** [PerformanceStatistics] around insertions/updates to data in the database. */
    val insertUpdate: PerformanceStatistics,
    /** [PerformanceStatistics] around gets of data from the database. */
    val get: PerformanceStatistics,
    /** [PerformanceStatistics] around deletions of data from the database. */
    val delete: PerformanceStatistics
) {
    suspend fun snapshot(): Snapshot =
        Snapshot(insertUpdate.snapshot(), get.snapshot(), delete.snapshot())

    /** Snapshot in time of [PerformanceStatistics] by operation type on [Database] instances. */
    data class Snapshot(
        val insertUpdate: PerformanceStatistics.Snapshot,
        val get: PerformanceStatistics.Snapshot,
        val delete: PerformanceStatistics.Snapshot
    )
}
