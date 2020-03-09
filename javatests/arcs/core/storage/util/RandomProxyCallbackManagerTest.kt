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

package arcs.core.storage.util

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.random.Random

@RunWith(JUnit4::class)
class RandomProxyCallbackManagerTest {
    @Test
    fun generatesNewTokens_untilUnusedOne_isFound() {
        val random = FakeRandom()
        val manager = RandomProxyCallbackManager<CrdtData, CrdtOperation, Unit>("test", random)
        val used = setOf(
            "0::test".hashCode(),
            "1::test".hashCode(),
            "2::test".hashCode()
        )
        val expected = "3::test".hashCode()
        val actual = manager.getNextToken(used)
        assertThat(actual).isEqualTo(expected)
    }

    private open class FakeRandom : Random() {
        var nextIntValue: Int = 0
        override fun nextBits(bitCount: Int): Int = nextIntValue++
        override fun nextInt(): Int = nextIntValue++
    }
}
