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
    StorageKeyParser.reset(RamDiskStorageKey)
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
    assertThat(StorageKeyParser.parse(key.toString())).isEqualTo(key)
  }
}
