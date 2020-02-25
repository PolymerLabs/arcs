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
import arcs.core.util.Time
import arcs.jvm.util.testutil.TimeImpl
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class PerformanceStatisticsTest {
    private val timer = Timer(TimeImpl())

    @Test
    fun constructor_noInitialStats() = runBlockingTest {
        val stats = PerformanceStatistics(timer, "foo", "bar")

        val snapshot = stats.snapshot()
        assertThat(snapshot).isEqualTo(
            PerformanceStatistics.Snapshot(
                RunningStatistics.Snapshot(),
                CounterStatistics.Snapshot(setOf("foo", "bar"))
            )
        )
    }

    @Test
    fun constructor_initialStats() = runBlockingTest {
        val initialSnapshot = PerformanceStatistics.Snapshot(
            RunningStatistics.Snapshot(1, min = 0.0, max = 0.0),
            CounterStatistics.Snapshot(
                mapOf(
                    "foo" to RunningStatistics.Snapshot(1, min = 10.0, max = 10.0),
                    "bar" to RunningStatistics.Snapshot(1, min = 5.0, max = 5.0)
                )
            )
        )
        val stats = PerformanceStatistics(timer, initialSnapshot, "foo", "bar")

        val snapshot = stats.snapshot()
        assertThat(snapshot).isEqualTo(initialSnapshot)
    }

    @Test
    fun snapshotAsync() = runBlockingTest {
        val initialSnapshot = PerformanceStatistics.Snapshot(
            RunningStatistics.Snapshot(1, min = 0.0, max = 0.0),
            CounterStatistics.Snapshot(
                mapOf(
                    "foo" to RunningStatistics.Snapshot(1, min = 10.0, max = 10.0),
                    "bar" to RunningStatistics.Snapshot(1, min = 5.0, max = 5.0)
                )
            )
        )
        val stats = PerformanceStatistics(timer, initialSnapshot, "foo", "bar")

        val deferred = stats.snapshotAsync(coroutineContext)

        assertThat(deferred.await()).isEqualTo(initialSnapshot)
    }

    @Test
    fun time() = runBlocking {
        val stats = PerformanceStatistics(timer, "foo")

        stats.time {
            Thread.sleep(500)
            it.increment("foo")
        }

        delay(100) // let the mutex in the time function run.

        val snapshot = stats.snapshot()
        assertThat(snapshot.runtimeStatistics.measurements).isEqualTo(1)
        assertThat(snapshot.runtimeStatistics.mean).isAtLeast(500 * 1000 * 1000)
        assertThat(snapshot.runtimeStatistics.min).isAtLeast(500 * 1000 * 1000)
        assertThat(snapshot.runtimeStatistics.max).isAtLeast(500 * 1000 * 1000)
        assertThat(snapshot.countStatistics["foo"].measurements).isEqualTo(1)
        assertThat(snapshot.countStatistics["foo"].mean).isEqualTo(1)
        assertThat(snapshot.countStatistics["foo"].min).isEqualTo(1)
        assertThat(snapshot.countStatistics["foo"].max).isEqualTo(1)
    }

    @Test
    fun timeSuspending() = runBlocking {
        val stats = PerformanceStatistics(timer, "foo")

        stats.timeSuspending {
            delay(500)
            it.increment("foo")
        }

        val snapshot = stats.snapshot()
        assertThat(snapshot.runtimeStatistics.measurements).isEqualTo(1)
        assertThat(snapshot.runtimeStatistics.mean).isAtLeast(500 * 1000 * 1000)
        assertThat(snapshot.runtimeStatistics.min).isAtLeast(500 * 1000 * 1000)
        assertThat(snapshot.runtimeStatistics.max).isAtLeast(500 * 1000 * 1000)
        assertThat(snapshot.countStatistics["foo"].measurements).isEqualTo(1)
        assertThat(snapshot.countStatistics["foo"].mean).isEqualTo(1)
        assertThat(snapshot.countStatistics["foo"].min).isEqualTo(1)
        assertThat(snapshot.countStatistics["foo"].max).isEqualTo(1)
    }
}
