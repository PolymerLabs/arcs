/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.util.performance

/**
 * Record of Arcs timing measurements. This is a global singleton so that any code in Arcs can
 * easily record timing metrics without complex plumbing.
 */
object TimingMeasurements {
  private val measurements = mutableMapOf<String, ArrayList<Long>>()
  private val METRIC_REGEX = lazy { Regex("[a-zA-Z0-9_.]+") }

  /** Record a metric. */
  fun record(metric: String, timeMs: Long) {
    require(METRIC_REGEX.value.matches(metric)) { "Invalid metric name: $metric" }
    measurements.getOrPut(metric) { ArrayList() }.add(timeMs)
  }

  /** Returns a copy of the measurements recorded so far. */
  fun get(): Map<String, ArrayList<Long>> {
    return measurements.mapValues { (_, value) -> ArrayList(value) }
  }

  /** Resets the measurements. */
  fun reset() {
    measurements.clear()
  }

  /** Convenience method to call both [get] and [reset]. */
  fun getAndReset() = get().also { reset() }
}
