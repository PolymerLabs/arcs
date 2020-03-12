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

package arcs.core.storage.driver

import arcs.core.common.ArcId
import arcs.core.storage.keys.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [VolatileMemory]. */
@RunWith(JUnit4::class)
class VolatileMemoryTest {
    private val bar = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
    private val baz = bar.childKeyWithComponent("baz")

    @Test
    fun tokenChanges_withEachPutData() {
        val memory = VolatileMemory()
        val originalToken = memory.token

        memory[bar] = VolatileEntry<Int>()

        val afterBar = memory.token
        assertThat(afterBar).isNotEqualTo(originalToken)

        memory[baz] = VolatileEntry<Int>()
        assertThat(memory.token).isNotEqualTo(originalToken)
        assertThat(memory.token).isNotEqualTo(afterBar)
    }

    @Test
    fun get_returnsNullIfNoEntryForKey() {
        val memory = VolatileMemory()
        memory[bar] = VolatileEntry<Int>()

        val value: VolatileEntry<Int>? = memory[baz]
        assertThat(value).isNull()
    }

    @Test
    fun get_returnsValueIfEntryExistsForKey() {
        val memory = VolatileMemory()
        val expectedValue = VolatileEntry(data = 42)
        memory[bar] = expectedValue

        val value: VolatileEntry<Int>? = memory[bar]
        assertThat(value).isEqualTo(expectedValue)
    }

    @Test
    fun keys_returnsAllKeys() {
        val memory = VolatileMemory()
        memory[bar] = VolatileEntry(data = 42)
        memory[baz] = VolatileEntry(data = 41)

        assertThat(memory.keys()).containsExactly(bar, baz)
    }
}
