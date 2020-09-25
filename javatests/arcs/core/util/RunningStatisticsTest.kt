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

import com.google.common.truth.Truth.assertThat
import kotlin.math.sqrt
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class RunningStatisticsTest {
  @Test
  fun stats_defaultToEmpty() {
    val statistics = RunningStatistics()
    assertThat(statistics.measurements).isEqualTo(0)
    assertThat(statistics.mean).isEqualTo(0)
    assertThat(statistics.varianceNumerator).isEqualTo(0)
    assertThat(statistics.variance).isEqualTo(0)
    assertThat(statistics.standardDeviation).isEqualTo(0)
  }

  @Test
  fun stats_mesurementsIncremented_withEachLog() {
    val statistics = RunningStatistics()
    statistics.logStat(1.0)
    assertThat(statistics.measurements).isEqualTo(1)
    statistics.logStat(1.0)
    assertThat(statistics.measurements).isEqualTo(2)
    statistics.logStat(1.0)
    assertThat(statistics.measurements).isEqualTo(3)
  }

  @Test
  fun stats_mean() {
    val statistics = RunningStatistics()

    statistics.logStat(1.0)
    statistics.logStat(0.0)
    statistics.logStat(1.0)

    assertThat(statistics.mean).isWithin(0.01).of(0.6666)
  }

  @Test
  fun stats_variance() {
    val statistics = RunningStatistics()

    statistics.logStat(1.0)
    statistics.logStat(2.0)
    statistics.logStat(3.0)

    assertThat(statistics.mean).isWithin(0.01).of(2.0)
    assertThat(statistics.variance).isWithin(0.01).of(
      ((1 - 2) * (1 - 2) + (2 - 2) * (2 - 2) + (3 - 2) * (3 - 2)) / 3.0
    )
  }

  @Test
  fun stats_standardDeviation() {
    val statistics = RunningStatistics()

    statistics.logStat(1.0)
    statistics.logStat(2.0)
    statistics.logStat(3.0)

    assertThat(statistics.mean).isWithin(0.01).of(2.0)
    assertThat(statistics.standardDeviation).isWithin(0.01).of(
      sqrt(((1 - 2) * (1 - 2) + (2 - 2) * (2 - 2) + (3 - 2) * (3 - 2)) / 3.0)
    )
  }

  @Test
  fun stats_largeRandoms() {
    val random = kotlin.random.Random(System.currentTimeMillis())
    val values = (0 until 1000).map { random.nextDouble(0.0, 100.0) }
    val fullMean = values.sum() / values.size
    val fullVariance = values.fold(0.0) { last, value ->
      last + (value - fullMean) * (value - fullMean)
    } / values.size
    val fullStandardDeviation = sqrt(fullVariance)

    val statistics = RunningStatistics()
    values.forEach { statistics.logStat(it) }

    assertThat(statistics.measurements).isEqualTo(values.size)
    assertThat(statistics.mean).isWithin(0.01).of(fullMean)
    assertThat(statistics.variance).isWithin(0.01).of(fullVariance)
    assertThat(statistics.standardDeviation).isWithin(0.01).of(fullStandardDeviation)
  }
}
