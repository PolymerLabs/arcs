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
    fun mutableBiMap_supportsStandardMapOps() {
        val bimap = MutableBiMap<Int, String>()
        bimap.put(1, "one")
        bimap.put(8, "eight")
        bimap.put(20, "twenty")
        bimap.put(15, "fifteen")
        bimap.put(40, "forty")

        assertThat(bimap.count()).isEqualTo(5)
        assertThat(bimap.lefts()).isEqualTo(mutableSetOf(1, 8, 20, 15, 40))
        assertThat(bimap.rights()).isEqualTo(
            mutableSetOf("one", "eight", "twenty", "fifteen", "forty")
        )
        assertThat(bimap.entries()).isEqualTo(
            mutableMapOf(
                1 to "one",
                8 to "eight",
                20 to "twenty",
                15 to "fifteen",
                40 to "forty"
            ).entries
        )

        assertThat(bimap.containsL(8)).isTrue()
        assertThat(bimap.containsR("forty")).isTrue()
        assertThat(bimap.getL("fifteen")).isEqualTo(15)
        assertThat(bimap.getR(1)).isEqualTo("one")

        assertThat(bimap.containsL(90)).isFalse()
        assertThat(bimap.containsR("fifty")).isFalse()
        assertThat(bimap.getL("seventeen")).isNull()
        assertThat(bimap.getR(66)).isNull()

        assertThat(bimap.remove(1, "one")).isTrue()
        assertThat(bimap.containsL(1)).isFalse()
        assertThat(bimap.containsR("one")).isFalse()
        assertThat(bimap.remove(1, "one")).isFalse()
        assertThat(bimap.lefts()).isEqualTo(mutableSetOf(8, 20, 15, 40))
        assertThat(bimap.rights()).isEqualTo(mutableSetOf("eight", "twenty", "fifteen", "forty"))

        assertThat(bimap.removeL(8)).isEqualTo("eight")
        assertThat(bimap.lefts()).isEqualTo(mutableSetOf(20, 15, 40))
        assertThat(bimap.rights()).isEqualTo(mutableSetOf("twenty", "fifteen", "forty"))

        assertThat(bimap.removeR("twenty")).isEqualTo(20)
        assertThat(bimap.lefts()).isEqualTo(mutableSetOf(15, 40))
        assertThat(bimap.rights()).isEqualTo(mutableSetOf("fifteen", "forty"))

        bimap.clear()
        assertThat(bimap.count()).isEqualTo(0)
    }
}
