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
package arcs.core.storage.keys

import arcs.core.storage.StorageKeyParser
import arcs.core.storage.embed
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [JoinStorageKey]. */
@RunWith(JUnit4::class)
class JoinStorageKeyTest {
    @Test
    fun toString_rendersCorrectly() {
        val key1 = RamDiskStorageKey("key1")
        val key2 = RamDiskStorageKey("key2")
        val key = JoinStorageKey(listOf(key1, key2))

        assertThat(key.toString())
            .isEqualTo("join://2/{$key1}{$key2}")
    }

    @Test
    fun toString_rendersCorrectly_whenNested() {
        val key1 = RamDiskStorageKey("key1")
        val key2 = RamDiskStorageKey("key2")
        val key1Reference = JoinStorageKey(listOf(key1, key2))
        val key2Reference = JoinStorageKey(listOf(key2, key1))
        val parent = JoinStorageKey(listOf(key1Reference, key2Reference))

        val embeddedKey1 = key1Reference.embed()
        val embeddedKey2 = key2Reference.embed()

        assertThat(parent.toString())
            .isEqualTo("join://2/{$embeddedKey1}{$embeddedKey2}")
    }

    @Test
    fun registersSelf_withStorageKeyParser() {
        val key1 = RamDiskStorageKey("key1")
        val key2 = RamDiskStorageKey("key2")
        val key1Reference = JoinStorageKey(listOf(key1, key2))
        val key2Reference = JoinStorageKey(listOf(key2, key1))
        val parent = JoinStorageKey(listOf(key1Reference, key2Reference))

        // Check the simple case.
        assertThat(StorageKeyParser.parse(key1Reference.toString())).isEqualTo(key1Reference)

        // Check the embedded/nested case.
        assertThat(StorageKeyParser.parse(parent.toString())).isEqualTo(parent)
    }
}
