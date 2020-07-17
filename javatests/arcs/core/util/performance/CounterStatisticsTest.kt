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
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CounterStatisticsTest {
    @Test
    fun constructor_varargNames() {
        val stats = CounterStatistics("foo", "bar", "baz")

        val snapshot = stats.snapshot()
        assertThat(snapshot.statistics).containsExactly(
            "foo", RunningStatistics.Snapshot(),
            "bar", RunningStatistics.Snapshot(),
            "baz", RunningStatistics.Snapshot()
        )
    }

    @Test
    fun constructor_setNames() {
        val stats = CounterStatistics(setOf("foo", "bar", "baz"))

        val snapshot = stats.snapshot()
        assertThat(snapshot.statistics).containsExactly(
            "foo", RunningStatistics.Snapshot(),
            "bar", RunningStatistics.Snapshot(),
            "baz", RunningStatistics.Snapshot()
        )
    }

    @Test
    fun constructor_fromSnapshot() {
        val snapshot = CounterStatistics.Snapshot(
            mapOf(
                "foo" to RunningStatistics.Snapshot(1, 1.0, 0.0, 0.0, 1.0, 1.0),
                "bar" to RunningStatistics.Snapshot(1, 2.0, 0.0, 0.0, 2.0, 2.0),
                "baz" to RunningStatistics.Snapshot(1, 3.0, 0.0, 0.0, 3.0, 3.0)
            )
        )

        val stats = CounterStatistics(snapshot)
        assertThat(stats.snapshot()).isEqualTo(snapshot)
    }

    @Test
    fun append() {
        val stats = CounterStatistics("foo")

        stats.append(
            stats.createCounters() // Foo not incremented
        )
        stats.append(
            stats.createCounters().also {
                it.increment("foo")
            }
        )
        stats.append(
            stats.createCounters().also {
                it.increment("foo")
                it.increment("foo")
            }
        )
        stats.append(
            stats.createCounters().also {
                it.increment("foo")
                it.increment("foo")
                it.increment("foo")
            }
        )

        val snapshot = stats.snapshot()["foo"]
        assertThat(snapshot.measurements).isEqualTo(4)
        assertThat(snapshot.min).isEqualTo(0.0)
        assertThat(snapshot.max).isEqualTo(3.0)
        assertThat(snapshot.mean)
            .isWithin(0.01).of(1.5)
        assertThat(snapshot.variance)
            .isWithin(0.01).of(1.25)
        assertThat(snapshot.standardDeviation)
            .isWithin(0.01).of(1.12)
    }

    @Test
    fun snapshot_withNames_createsCopy_whenNamesMatch() {
        val stats = CounterStatistics("foo", "bar")

        stats.append(
            stats.createCounters().also {
                it.increment("foo")
                it.increment("bar")
            }
        )

        val snapshot = stats.snapshot()
        val snapshotCopy = snapshot.withNames(setOf("foo", "bar"))

        assertThat(snapshotCopy).isEqualTo(snapshot)
    }

    @Test
    fun snapshot_withExtraNames_createsCopy_withEmptyValuesForExtras() {
        val stats = CounterStatistics("foo")

        stats.append(
            stats.createCounters().also {
                it.increment("foo")
            }
        )

        val snapshot = stats.snapshot()
        val snapshotCopy = snapshot.withNames(setOf("foo", "bar"))

        assertThat(snapshotCopy).isEqualTo(
            CounterStatistics.Snapshot(
                mapOf(
                    "foo" to snapshot["foo"],
                    "bar" to RunningStatistics.Snapshot()
                )
            )
        )
    }

    @Test
    fun snapshot_withFewerNames_createsCopy_withMissingNamesRemoved() {
        val stats = CounterStatistics("foo", "bar")

        stats.append(
            stats.createCounters().also {
                it.increment("foo")
                it.increment("bar")
            }
        )

        val snapshot = stats.snapshot()
        val snapshotCopy = snapshot.withNames(setOf("foo"))

        val e = assertFailsWith<IllegalArgumentException> {
            snapshotCopy["bar"]
        }
        assertThat(e).hasMessageThat().contains("Counter with name \"bar\" not registered")

        assertThat(snapshotCopy["foo"]).isEqualTo(snapshot["foo"])
    }
}
