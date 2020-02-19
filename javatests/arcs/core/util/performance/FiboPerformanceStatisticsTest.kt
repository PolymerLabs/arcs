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

import arcs.core.util.Time
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class FiboPerformanceStatisticsTest {
    @Test
    fun compareStats() = runBlocking {
        val calculator = FibonacciCalculator()
        assertThat(calculator.fiboSlow(0)).isEqualTo(1)
        assertThat(calculator.fiboSlow(1)).isEqualTo(1)
        assertThat(calculator.fiboSlow(2)).isEqualTo(2)
        assertThat(calculator.fiboSlow(3)).isEqualTo(3)
        assertThat(calculator.fiboSlow(4)).isEqualTo(5)
        assertThat(calculator.fiboSlow(5)).isEqualTo(8)
        assertThat(calculator.fiboSlow(20)).isEqualTo(10946)

        assertThat(calculator.fiboFast(0)).isEqualTo(1)
        assertThat(calculator.fiboFast(1)).isEqualTo(1)
        assertThat(calculator.fiboFast(2)).isEqualTo(2)
        assertThat(calculator.fiboFast(3)).isEqualTo(3)
        assertThat(calculator.fiboFast(4)).isEqualTo(5)
        assertThat(calculator.fiboFast(5)).isEqualTo(8)
        assertThat(calculator.fiboFast(20)).isEqualTo(10946)

        val slowStats = calculator.fiboSlowStats.snapshot()
        val fastStats = calculator.fiboFastStats.snapshot()

        println()
        println("Fibonacci Number Algorithm Performance")
        println()
        println("Slow Runtime (nanos):")
        println("  ${slowStats.runtimeStatistics}")
        println("Fast Runtime (nanos):")
        println("  ${fastStats.runtimeStatistics}")
        println()
        println("Slow Counts:")
        println("  additions:")
        println("    ${slowStats.countStatistics["additions"]}")
        println("  recursive calls:")
        println("    ${slowStats.countStatistics["recursiveCalls"]}")
        println("Fast Counts:")
        println("  additions:")
        println("    ${fastStats.countStatistics["additions"]}")
        println("  loops:")
        println("    ${fastStats.countStatistics["loops"]}")

        assertThat(slowStats.runtimeStatistics.measurements)
            .isEqualTo(fastStats.runtimeStatistics.measurements)
        assertThat(slowStats.runtimeStatistics.mean)
            .isGreaterThan(fastStats.runtimeStatistics.mean)
        assertThat(slowStats.runtimeStatistics.max)
            .isGreaterThan(fastStats.runtimeStatistics.max)

        assertThat(slowStats.countStatistics["additions"].measurements)
            .isEqualTo(fastStats.countStatistics["additions"].measurements)
        assertThat(slowStats.countStatistics["additions"].mean)
            .isGreaterThan(fastStats.countStatistics["additions"].mean)
        assertThat(slowStats.countStatistics["additions"].max)
            .isGreaterThan(fastStats.countStatistics["additions"].max)
    }

    /** Implementation of the example from the KDoc on [PerformanceStatistics]. */
    private class FibonacciCalculator {
        val fiboSlowStats = PerformanceStatistics(Timer(PlatformTime), "additions", "recursiveCalls")
        val fiboFastStats = PerformanceStatistics(Timer(PlatformTime), "additions", "loops")

        suspend fun fiboSlow(n: Int): Int = fiboSlowStats.timeSuspending { counters ->
            fun inner(n: Int): Int {
                if (n == 0 || n == 1) return 1

                counters.increment("recursiveCalls")
                val nMinus2 = inner(n - 2)
                counters.increment("recursiveCalls")
                val nMinus1 = inner(n - 1)

                counters.increment("additions")
                return nMinus2 + nMinus1
            }

            return@timeSuspending inner(n)
        }

        suspend fun fiboFast(n: Int): Int = fiboFastStats.timeSuspending { counters ->
            var nMinus2 = 0
            var nMinus1 = 1

            repeat(n) {
                counters.increment("loops")
                counters.increment("additions")
                val sum = nMinus1 + nMinus2
                nMinus2 = nMinus1
                nMinus1 = sum
            }

            return@timeSuspending nMinus1
        }
    }

    private object PlatformTime : Time() {
        override val currentTimeNanos: Long
            get() = System.nanoTime()
        override val currentTimeMillis: Long
            get() = System.currentTimeMillis()
    }
}
