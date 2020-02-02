/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.data

import arcs.core.testutil.assertThrows
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
    @Test
    fun ttl_init() {
      assertThrows(IllegalArgumentException::class) {
        Ttl(-1, Ttl.Units.Day)
        Ttl(-10, null)
        Ttl(10, null)
      }
    }

    @Test
    fun ttl_minutes() {
      assertThat(Ttl.Infinite.minutes).isEqualTo(-1)
      assertThat(Ttl(4, Ttl.Units.Minute).minutes).isEqualTo(4)
      assertThat(Ttl(3, Ttl.Units.Hour).minutes).isEqualTo(180)
      assertThat(Ttl(2, Ttl.Units.Day).minutes).isEqualTo(2880)
    }

    @Test
    fun ttl_equals() {
      assertThat(Ttl(5, Ttl.Units.Day).equals(Ttl(2, Ttl.Units.Day)))
      assertThat(Ttl.Infinite.equals(Ttl.Infinite))
      assertThat(Ttl(60, Ttl.Units.Minute).equals(Ttl(2, Ttl.Units.Hour)))
      assertThat(!Ttl(5, Ttl.Units.Minute).equals(Ttl(5, Ttl.Units.Hour)))
    }

    @Test
    fun ttl_isInfinite() {
      assertFalse(Ttl(60, Ttl.Units.Minute).isInfinite)
      assertTrue(Ttl.Infinite.isInfinite)
    }
}
