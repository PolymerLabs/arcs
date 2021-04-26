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

import arcs.core.storage.StorageKeyManager
import arcs.core.storage.StorageKeyProtocol
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
/** Tests for [RamDiskStorageKey]. */
@RunWith(Parameterized::class)
class RamDiskStorageKeyTest(parameters: ParameterizedBuildFlags) {

  @get:Rule
  val buildFlagsRule = BuildFlagsRule.parameterized(parameters)

  @Before
  fun setup() {
    StorageKeyManager.GLOBAL_INSTANCE.reset(RamDiskStorageKey)
  }

  @Test
  fun toString_rendersCorrectly() {
    val key = RamDiskStorageKey("foo")
    assertThat(key.toString()).isEqualTo("${StorageKeyProtocol.RamDisk.protocol}foo")
  }

  @Test
  fun newKeyWithComponent_hasCorrectFormat() {
    val parent = RamDiskStorageKey("parent")
    val child = parent.newKeyWithComponent("child")
    val expected = if (BuildFlags.STORAGE_KEY_REDUCTION) "child" else "parent/child"
    assertThat(child.toString()).isEqualTo("${StorageKeyProtocol.RamDisk.protocol}$expected")
  }

  @Test
  fun registersSelf_withStorageKeyParser() {
    val key = RamDiskStorageKey("foo")
    assertThat(StorageKeyManager.GLOBAL_INSTANCE.parse(key.toString())).isEqualTo(key)
  }

  @Test
  fun parse_validString_correctly() {
    val key = RamDiskStorageKey.parse("123@abc/whatever")
    assertThat(key.toKeyString()).isEqualTo("123@abc/whatever")
  }

  @Test
  fun parse_validUnicodeString_correctly() {
    val key = RamDiskStorageKey.parse("Туктамышева")
    assertThat(key.toKeyString()).isEqualTo("Туктамышева")
  }

  private companion object {
    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS = ParameterizedBuildFlags.of("STORAGE_KEY_REDUCTION")
  }
}
