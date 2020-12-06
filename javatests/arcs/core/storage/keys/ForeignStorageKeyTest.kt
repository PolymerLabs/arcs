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

import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.StorageKeyManager
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [VolatileStorageKey]. */
@RunWith(JUnit4::class)
class ForeignStorageKeyTest {
  @Before
  fun setup() {
    StorageKeyManager.GLOBAL_INSTANCE.reset(ForeignStorageKey)
  }

  @Test
  fun toString_rendersCorrectly() {
    val key = ForeignStorageKey("foo")
    assertThat(key.toString()).isEqualTo("foreign://foo")
    assertThat(StorageKeyManager.GLOBAL_INSTANCE.parse(key.toString())).isEqualTo(key)
  }

  @Test
  fun childKeyWithComponent_isCorrect() {
    val parent = ForeignStorageKey("parent")
    val child = parent.childKeyWithComponent("child")
    assertThat(child.toString())
      .isEqualTo("foreign://parent/child")
  }

  @Test
  fun createFromSchema() {
    val schema = Schema(
      setOf(SchemaName("schemaName")),
      SchemaFields(emptyMap(), emptyMap()),
      "abcd"
    )
    val key = ForeignStorageKey(schema)
    assertThat(key.toString()).isEqualTo("foreign://schemaName")
  }

  @Test
  fun parse_validString_correctly() {
    val key = ForeignStorageKey.parse("123@abc/whatever")
    assertThat(key.toKeyString()).isEqualTo("123@abc/whatever")
  }

  @Test
  fun parse_validUnicodeString_correctly() {
    val key = ForeignStorageKey.parse("Туктамышева")
    assertThat(key.toKeyString()).isEqualTo("Туктамышева")
  }
}
