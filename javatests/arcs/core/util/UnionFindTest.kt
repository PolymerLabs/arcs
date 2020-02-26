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
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class UnionFindTest {
    @Test
    fun makeSetCreatesDisjointSets() {
        var uf = UnionFind<Int>()
        uf.makeSet(10)
        uf.makeSet(20)
        assertThat(uf.find(10)).isEqualTo(10)
        assertThat(uf.find(20)).isEqualTo(20)
        assertThat(uf.find(10)).isNotEqualTo(uf.find(20))
        assertThat(uf.find(20)).isNotEqualTo(uf.find(10))
    }

    @Test
    fun unionMergesClasses() {
        var uf = UnionFind<Int>()
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
}
