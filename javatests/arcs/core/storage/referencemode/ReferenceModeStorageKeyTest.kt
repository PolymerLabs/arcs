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
package arcs.core.storage.referencemode

import arcs.core.storage.embed
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [ReferenceModeStorageKey]. */
@RunWith(JUnit4::class)
class ReferenceModeStorageKeyTest {
    @Test
    fun toString_rendersCorrectly() {
        val backing = RamDiskStorageKey("backing")
        val direct = RamDiskStorageKey("direct")
        val key = ReferenceModeStorageKey(backing, direct)

        assertThat(key.toString())
            .isEqualTo("$REFERENCE_MODE_PROTOCOL://{$backing}{$direct}")
    }

    @Test
    fun toString_rendersCorrectly_whenNested() {
        val backing = RamDiskStorageKey("backing")
        val direct = RamDiskStorageKey("direct")
        val backingReference = ReferenceModeStorageKey(backing, direct)
        val directReference = ReferenceModeStorageKey(direct, backing)
        val parent = ReferenceModeStorageKey(backingReference, directReference)

        val embeddedBacking = backingReference.embed()
        val embeddedDirect = directReference.embed()

        assertThat(parent.toString())
            .isEqualTo("$REFERENCE_MODE_PROTOCOL://{$embeddedBacking}{$embeddedDirect}")
    }

    @Test
    fun registersSelf_withStorageKeyParser() {
        val backing = RamDiskStorageKey("backing")
        val direct = RamDiskStorageKey("direct")
        val backingReference = ReferenceModeStorageKey(backing, direct)
        val directReference = ReferenceModeStorageKey(direct, backing)
        val parent = ReferenceModeStorageKey(backingReference, directReference)

        // Check the simple case.
        assertThat(StorageKeyParser.parse(backingReference.toString())).isEqualTo(backingReference)

        // Check the embedded/nested case.
        assertThat(StorageKeyParser.parse(parent.toString())).isEqualTo(parent)
    }
}
