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

import arcs.core.storage.StorageKeyManager
import arcs.core.storage.StorageKeyProtocol
import arcs.core.storage.embed
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

/** Tests for [ReferenceModeStorageKey]. */
@RunWith(Parameterized::class)
class ReferenceModeStorageKeyTest(parameters: ParameterizedBuildFlags) {

  @get:Rule
  val buildFlagsRule = BuildFlagsRule.parameterized(parameters)

  @Before
  fun setUp() {
    StorageKeyManager.GLOBAL_INSTANCE.reset(
      ReferenceModeStorageKey,
      RamDiskStorageKey
    )
  }

  @Test
  fun differentProtocolsThrows() {
    val backing = DatabaseStorageKey.Persistent("db", "abcdef")
    val direct = RamDiskStorageKey("direct")
    val exception = assertFailsWith<IllegalArgumentException> {
      ReferenceModeStorageKey(backing, direct)
    }
    assertThat(exception).hasMessageThat().startsWith(
      "Different protocols (${StorageKeyProtocol.Database} and ${StorageKeyProtocol.RamDisk}) in " +
        "a ReferenceModeStorageKey can cause problems"
    )
  }

  @Test
  fun toString_rendersCorrectly() {
    val backing = RamDiskStorageKey("backing")
    val direct = RamDiskStorageKey("direct")
    val key = ReferenceModeStorageKey(backing, direct)

    assertThat(key.toString())
      .isEqualTo("${StorageKeyProtocol.ReferenceMode.protocol}{$backing}{$direct}")
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
      .isEqualTo("${StorageKeyProtocol.ReferenceMode.protocol}{$embeddedBacking}{$embeddedDirect}")
  }

  @Test
  fun registersSelf_withStorageKeyParser() {
    val backing = RamDiskStorageKey("backing")
    val direct = RamDiskStorageKey("direct")
    val backingReference = ReferenceModeStorageKey(backing, direct)
    val directReference = ReferenceModeStorageKey(direct, backing)
    val parent = ReferenceModeStorageKey(backingReference, directReference)

    // Check the simple case.
    assertThat(
      StorageKeyManager.GLOBAL_INSTANCE.parse(backingReference.toString())
    ).isEqualTo(backingReference)

    // Check the embedded/nested case.
    assertThat(StorageKeyManager.GLOBAL_INSTANCE.parse(parent.toString())).isEqualTo(parent)
  }

  @Test
  fun newKeyWithComponent() {
    val backing = RamDiskStorageKey("backing")
    val direct = RamDiskStorageKey("direct")
    val parent = ReferenceModeStorageKey(backing, direct)
    val expected = if (BuildFlags.STORAGE_KEY_REDUCTION) "child" else "direct/child"
    assertThat(parent.newKeyWithComponent("child"))
      .isEqualTo(ReferenceModeStorageKey(backing, RamDiskStorageKey(expected)))
  }

  private companion object {
    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS = ParameterizedBuildFlags.of("STORAGE_KEY_REDUCTION")
  }
}
