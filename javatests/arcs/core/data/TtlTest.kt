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

import arcs.core.util.Time
import com.google.common.truth.Truth.assertThat
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Ttl]. */
@RunWith(JUnit4::class)
class TtlTest {
    @Before
    fun setUp() {
        Ttl.time = TimeImpl()
    }

    @Test
    fun ttl_minutes() {
        assertThat(Ttl.Infinite.minutes).isEqualTo(-1)
        assertThat(Ttl.Minutes(4).minutes).isEqualTo(4)
        assertThat(Ttl.Hours(3).minutes).isEqualTo(180)
        assertThat(Ttl.Days(2).minutes).isEqualTo(2880)
    }

    @Test
    fun ttl_equals() {
        assertThat(Ttl.Infinite.equals(Ttl.Infinite))
        assertThat(Ttl.Days(2).equals(Ttl.Days(2)))
        assertThat(Ttl.Minutes(60).equals(Ttl.Hours(2)))
        assertThat(Ttl.Days(2).equals(Ttl.Hours(48)))
        assertThat(!Ttl.Minutes(5).equals(Ttl.Hours(5)))
    }

    @Test
    fun ttl_isInfinite() {
        assertFalse(Ttl.Minutes(60).isInfinite)
        assertTrue(Ttl.Infinite.isInfinite)
    }

    // TODO(mmandlis): make a testutil/ Time implementation and reuse in all tests.
    // What package should it be in?
    private class TimeImpl : Time() {
        override val currentTimeNanos: Long
            get() = System.nanoTime()
        override val currentTimeMillis: Long
            get() = System.currentTimeMillis()
    }
}
