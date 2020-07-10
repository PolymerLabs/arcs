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

@RunWith(JUnit4::class)
class UnionFindTest {
    @Test
    fun makeSetCreatesDisjointSets() {
        var uf = UnionFind<Int, Unit>()
        uf.makeSet(10)
        uf.makeSet(20)
        assertThat(uf.find(10)).isEqualTo(10)
        assertThat(uf.find(20)).isEqualTo(20)
        assertThat(uf.find(10)).isNotEqualTo(uf.find(20))
        assertThat(uf.find(20)).isNotEqualTo(uf.find(10))
    }

    @Test
    fun unionMergesClasses() {
        var uf = UnionFind<Int, Unit>()
        uf.makeSet(10)
        uf.makeSet(20)
        uf.makeSet(30)
        uf.makeSet(40)
        uf.union(20, 30)
        uf.union(30, 40)
        // 10 is its own equivalence class.
        assertThat(uf.find(10)).isEqualTo(10)
        // 20, 30, 40 are in the same equivalence class.
        assertThat(uf.find(20)).isEqualTo(uf.find(30))
        assertThat(uf.find(20)).isEqualTo(uf.find(40))
        assertThat(uf.find(30)).isEqualTo(uf.find(40))
        // 10 is in a different equivalent class than {20, 30, 40}
        assertThat(uf.find(10)).isNotEqualTo(uf.find(20))
        assertThat(uf.find(10)).isNotEqualTo(uf.find(30))
        assertThat(uf.find(10)).isNotEqualTo(uf.find(40))
    }

    @Test
    fun makeSetWithInfo() {
        var uf = UnionFind<Int, Int>()
        uf.makeSet(10, 10)
        uf.makeSet(20, 20)
        assertThat(uf.getInfo(10)).isEqualTo(10)
        assertThat(uf.getInfo(20)).isEqualTo(20)
    }

    @Test
    fun setInfoUpdatesEquivalenceClassInfo() {
        var uf = UnionFind<Int, Int>()
        uf.makeSet(10, 10)
        uf.makeSet(20, 20)
        uf.makeSet(30, 30)
        uf.makeSet(40, 40)
        assertThat(uf.getInfo(10)).isEqualTo(10)
        assertThat(uf.getInfo(20)).isEqualTo(20)
        assertThat(uf.getInfo(30)).isEqualTo(30)
        assertThat(uf.getInfo(40)).isEqualTo(40)
        uf.union(20, 30)
        uf.setInfo(20, 25)
        assertThat(uf.getInfo(30)).isEqualTo(25)
    }

    @Test
    fun unionCombinesInfo() {
        // Info keeps track of the size of equivalence classes.
        val intSum: (Int?, Int?) -> Int? = fun(x: Int?, y: Int?): Int? {
            return if (x == null || y == null) null else x + y
        }
        var uf = UnionFind<Int, Int>()
        uf.makeSet(10, 1)
        uf.makeSet(20, 1)
        uf.makeSet(30, 1)
        uf.makeSet(40, 1)
        uf.makeSet(50, 1)
        uf.makeSet(60, 1)
        uf.union(20, 30, intSum)
        uf.union(30, 40, intSum)
        uf.union(50, 60, intSum)
        assertThat(uf.getInfo(10)).isEqualTo(1)
        assertThat(uf.getInfo(20)).isEqualTo(3)
        assertThat(uf.getInfo(30)).isEqualTo(3)
        assertThat(uf.getInfo(40)).isEqualTo(3)
        assertThat(uf.getInfo(50)).isEqualTo(2)
        assertThat(uf.getInfo(60)).isEqualTo(2)
    }
}
