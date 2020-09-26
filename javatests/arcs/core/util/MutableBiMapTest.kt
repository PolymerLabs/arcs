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
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [MutableBiMap]. */
@RunWith(JUnit4::class)
class MutableBiMapTest {

  @Test
  fun mutableBiMap_supportsPutOp() {
    val bimap = MutableBiMap<Int, String>()
    bimap.put(1, "one")
    bimap.put(8, "eight")
    bimap.put(20, "twenty")
    bimap.put(15, "fifteen")
    bimap.put(40, "forty")

    assertThat(bimap.size).isEqualTo(5)
    assertThat(bimap.lefts).isEqualTo(setOf(1, 8, 20, 15, 40))
    assertThat(bimap.rights).isEqualTo(
      setOf("one", "eight", "twenty", "fifteen", "forty")
    )
    assertThat(bimap.entries).isEqualTo(
      mapOf(
        1 to "one",
        8 to "eight",
        20 to "twenty",
        15 to "fifteen",
        40 to "forty"
      ).entries
    )
  }

  @Test
  fun mutableBiMap_supportsContainsOp() {
    val bimap = MutableBiMap<Int, String>()
    bimap.put(1, "one")
    bimap.put(8, "eight")
    bimap.put(20, "twenty")
    bimap.put(15, "fifteen")
    bimap.put(40, "forty")

    assertThat(bimap.containsL(1)).isTrue()
    assertThat(bimap.containsL(8)).isTrue()
    assertThat(bimap.containsL(20)).isTrue()
    assertThat(bimap.containsL(15)).isTrue()
    assertThat(bimap.containsL(40)).isTrue()

    assertThat(bimap.containsL(45)).isFalse()

    assertThat(bimap.containsR("one")).isTrue()
    assertThat(bimap.containsR("eight")).isTrue()
    assertThat(bimap.containsR("twenty")).isTrue()
    assertThat(bimap.containsR("fifteen")).isTrue()
    assertThat(bimap.containsR("forty")).isTrue()

    assertThat(bimap.containsR("forty-five")).isFalse()

    val bimap2 = MutableBiMap<Int, Int>()
    bimap2.put(1, 3)
    bimap2.put(2, 4)
    bimap2.put(3, 5)

    assertThat(bimap2.containsL(3)).isTrue()
    assertThat(bimap2.containsR(3)).isTrue()
    assertThat(bimap2.containsL(5)).isFalse()
    assertThat(bimap2.containsR(1)).isFalse()
  }

  @Test
  fun mutableBiMap_supportsGetOp() {
    val bimap = MutableBiMap<Int, String>()
    bimap.put(1, "one")
    bimap.put(8, "eight")
    bimap.put(20, "twenty")
    bimap.put(15, "fifteen")
    bimap.put(40, "forty")

    assertThat(bimap.getL("fifteen")).isEqualTo(15)
    assertThat(bimap.getR(1)).isEqualTo("one")

    assertThat(bimap.getL("seventeen")).isNull()
    assertThat(bimap.getR(66)).isNull()
  }

  @Test
  fun mutableBiMap_supportsRemoveOp() {
    val bimap = MutableBiMap<Int, String>()
    bimap.put(1, "one")
    bimap.put(8, "eight")
    bimap.put(20, "twenty")
    bimap.put(15, "fifteen")
    bimap.put(40, "forty")

    assertThat(bimap.removeL(1)).isEqualTo("one")
    assertThat(bimap.containsL(1)).isFalse()
    assertThat(bimap.containsR("one")).isFalse()
    assertThat(bimap.removeR("one")).isNull()
    assertThat(bimap.lefts).isEqualTo(setOf(8, 20, 15, 40))
    assertThat(bimap.rights).isEqualTo(setOf("eight", "twenty", "fifteen", "forty"))

    assertThat(bimap.removeL(8)).isEqualTo("eight")
    assertThat(bimap.lefts).isEqualTo(setOf(20, 15, 40))
    assertThat(bimap.rights).isEqualTo(setOf("twenty", "fifteen", "forty"))

    assertThat(bimap.removeR("twenty")).isEqualTo(20)
    assertThat(bimap.lefts).isEqualTo(setOf(15, 40))
    assertThat(bimap.rights).isEqualTo(setOf("fifteen", "forty"))
  }

  @Test
  fun mutableBiMap_supportsClearOp() {
    val bimap = MutableBiMap<Int, String>()
    bimap.put(1, "one")
    bimap.put(8, "eight")
    bimap.put(20, "twenty")
    bimap.put(15, "fifteen")
    bimap.put(40, "forty")

    assertThat(bimap.size).isEqualTo(5)
    bimap.clear()
    assertThat(bimap.size).isEqualTo(0)
    assertThat(bimap.containsL(1)).isFalse()
    assertThat(bimap.containsL(8)).isFalse()
    assertThat(bimap.containsL(20)).isFalse()
    assertThat(bimap.containsL(15)).isFalse()
    assertThat(bimap.containsL(40)).isFalse()
    assertThat(bimap.containsR("one")).isFalse()
    assertThat(bimap.containsR("eight")).isFalse()
    assertThat(bimap.containsR("twenty")).isFalse()
    assertThat(bimap.containsR("fifteen")).isFalse()
    assertThat(bimap.containsR("forty")).isFalse()
  }
}
