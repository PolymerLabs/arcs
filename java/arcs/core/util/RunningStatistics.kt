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

package arcs.core.util

import kotlin.math.sqrt

/**
 * Implementation of running statistics, accumulating mean, variance, and standard deviation one
 * measurement at a time, without maintaining the entire history of data points.
 *
 * Algorithm comes from Knuth's The Art of Computer Programming.
 */
class RunningStatistics(
    measurements: Int = 0,
    mean: Double = 0.0,
    varianceNumerator: Double = 0.0,
    min: Double? = null,
    max: Double? = null
) {
    constructor(snapshot: Snapshot) : this(
        snapshot.measurements,
        snapshot.mean,
        snapshot.variance * snapshot.measurements,
        snapshot.min,
        snapshot.max
    )

    var measurements: Int = measurements
        private set
    var mean: Double = mean
        private set
    var varianceNumerator: Double = varianceNumerator
        private set
    val variance: Double
        get() = if (measurements > 1) varianceNumerator / measurements else 0.0
    val standardDeviation: Double
        get() = sqrt(variance)
    var min: Double? = min
        private set
    var max: Double? = max
        private set

    fun logStat(value: Double) {
        measurements++
        if (measurements == 1) {
            mean = value
        } else {
            val lastMean = mean
            mean += (value - mean) / measurements
            varianceNumerator += (value - lastMean) * (value - mean)
        }

        min = min?.let { minOf(value, it) } ?: value
        max = max?.let { maxOf(value, it) } ?: value
    }

    /** Freezes the [RunningStatistics] into an immutable [Snapshot]. */
    fun snapshot() = Snapshot(measurements, mean, variance, standardDeviation, min, max)

    /** Immutable capture of the values in a [RunningStatistics] object. */
    data class Snapshot(
        val measurements: Int = 0,
        val mean: Double = 0.0,
        val variance: Double = 0.0,
        val standardDeviation: Double = 0.0,
        val min: Double? = null,
        val max: Double? = null
    )
}
