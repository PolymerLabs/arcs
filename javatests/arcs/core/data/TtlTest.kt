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
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Ttl]. */
@RunWith(JUnit4::class)
class TtlTest {
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

    @Test
    fun ttl_fromString() {
        assertThat(Ttl.fromString("20minutes")).isEqualTo(Ttl.Minutes(20))
        assertThat(Ttl.fromString("1 minute")).isEqualTo(Ttl.Minutes(1))
        assertThat(Ttl.fromString("5m")).isEqualTo(Ttl.Minutes(5))
        assertThat(Ttl.fromString("6 hours")).isEqualTo(Ttl.Hours(6))
        assertThat(Ttl.fromString("1hour")).isEqualTo(Ttl.Hours(1))
        assertThat(Ttl.fromString("24h")).isEqualTo(Ttl.Hours(24))
        assertThat(Ttl.fromString("3 days")).isEqualTo(Ttl.Days(3))
        assertThat(Ttl.fromString("1 day")).isEqualTo(Ttl.Days(1))
        assertThat(Ttl.fromString("2d")).isEqualTo(Ttl.Days(2))
    }
}
