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
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [RamDiskStorageKey]. */
@RunWith(JUnit4::class)
class RamDiskStorageKeyTest {

  @Before
  fun setup() {
    StorageKeyManager.GLOBAL_INSTANCE.reset(RamDiskStorageKey)
  }

  @Test
  fun toString_rendersCorrectly() {
    val key = RamDiskStorageKey("foo")
    assertThat(key.toString()).isEqualTo("${RamDiskStorageKey.protocol}://foo")
  }

  @Test
  fun childKey_hasCorrectFormat() {
    val parent = RamDiskStorageKey("parent")
    val child = parent.childKeyWithComponent("child")
    assertThat(child.toString()).isEqualTo("${RamDiskStorageKey.protocol}://parent/child")
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
}
