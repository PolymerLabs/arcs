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

package arcs.core.data

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Ttl]. */
@RunWith(JUnit4::class)
class TimeRangeTest {
    @Test
    fun timeRange_fullRange() {
        val range = TimeRange(1, 20)
        assertThat(range.inRange(10)).isTrue()
        assertThat(range.inRange(100)).isFalse()
        assertThat(range.inRange(RawEntity.UNINITIALIZED_TIMESTAMP)).isFalse()
    }

    @Test
    fun timeRange_unlimitedRange() {
        val range = TimeRange()
        assertThat(range.inRange(10)).isTrue()
        assertThat(range.inRange(100)).isTrue()
        assertThat(range.inRange(RawEntity.UNINITIALIZED_TIMESTAMP)).isFalse()
    }

    @Test
    fun timeRange_startRange() {
        val range = TimeRange(5)
        assertThat(range.inRange(3)).isFalse()
        assertThat(range.inRange(100)).isTrue()
        assertThat(range.inRange(RawEntity.UNINITIALIZED_TIMESTAMP)).isFalse()
    }

    @Test
    fun timeRange_endRange() {
        val range = TimeRange(null, 20)
        assertThat(range.inRange(1)).isTrue()
        assertThat(range.inRange(100)).isFalse()
        assertThat(range.inRange(RawEntity.UNINITIALIZED_TIMESTAMP)).isFalse()
  }
}
