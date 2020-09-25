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
import arcs.core.testutil.fail
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class DatabaseStorageKeyTest {
  @Before
  fun setUp() {
    StorageKeyParser.addParser(DatabaseStorageKey.Memory)
    StorageKeyParser.addParser(DatabaseStorageKey.Persistent)
  }

  @Test
  fun toString_renders_correctly_persistent() {
    val key = DatabaseStorageKey.Persistent("foo", "1234a", dbName = "myDb")
    assertThat(key.toString())
      .isEqualTo("${DatabaseStorageKey.Persistent.protocol}://1234a@myDb/foo")
  }

  @Test
  fun toString_renders_correctly_nonPersistent() {
    val key = DatabaseStorageKey.Memory("foo", "1234a", dbName = "myDb")
    assertThat(key.toString())
      .isEqualTo("${DatabaseStorageKey.Memory.protocol}://1234a@myDb/foo")
  }

  @Test
  fun fromString_parses_correctly_persistent() {
    val key = DatabaseStorageKey.Persistent.parse("1234a@myDb/foo")
    assertThat(key).isInstanceOf(DatabaseStorageKey.Persistent::class.java)
    assertThat(key.unique).isEqualTo("foo")
    assertThat(key.entitySchemaHash).isEqualTo("1234a")
    assertThat(key.dbName).isEqualTo("myDb")
  }

  @Test
  fun fromString_parses_correctly_nonPersistent() {
    val key = DatabaseStorageKey.Memory.parse("1234a@myDb/foo")
    assertThat(key).isInstanceOf(DatabaseStorageKey.Memory::class.java)
    assertThat(key.unique).isEqualTo("foo")
    assertThat(key.entitySchemaHash).isEqualTo("1234a")
    assertThat(key.dbName).isEqualTo("myDb")
  }

  @Test
  fun requires_dbName_tohaveAtLeastOneAlphabeticalChar_asFirstChar() {
    val options = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    options.forEach {
      DatabaseStorageKey.Persistent("foo", "1234a", "$it")
    }

    val illegalStarters = "0123456789_-"
    illegalStarters.forEach {
      assertFailsWith<IllegalArgumentException> {
        DatabaseStorageKey.Persistent("foo", "1234a", "${it}ThenLegal")
      }
      assertFailsWith<IllegalArgumentException> {
        DatabaseStorageKey.Memory("foo", "1234a", "${it}ThenLegal")
      }
    }
  }

  @Test
  fun requires_dbName_toHaveNoWeirdCharacters() {
    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "1234a", "no spaces")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "1234a", "no:colons")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "1234a", "slashes/arent/cool")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "1234a", "periods.shouldnt.be.allowed")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory("foo", "1234a", "no spaces")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory("foo", "1234a", "no:colons")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory("foo", "1234a", "slashes/arent/cool")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory("foo", "1234a", "periods.shouldnt.be.allowed")
    }
  }

  @Test
  fun requires_entitySchemaHash_toBeValidHexString() {
    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "", "myDb")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "g", "myDb")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "1234a_", "myDb")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory("foo", "", "myDb")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory("foo", "g", "myDb")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory("foo", "1234a_", "myDb")
    }
  }

  @Test
  fun registers_self_withParser_persistent() {
    val keyString = "${DatabaseStorageKey.Persistent.protocol}://1234a@myDb/foo"
    val key = StorageKeyParser.parse(keyString) as? DatabaseStorageKey.Persistent
      ?: fail("Expected a DatabaseStorageKey")
    assertThat(key.dbName).isEqualTo("myDb")
    assertThat(key.entitySchemaHash).isEqualTo("1234a")
    assertThat(key.unique).isEqualTo("foo")
  }

  @Test
  fun registers_self_withParser_memory() {
    val keyString = "${DatabaseStorageKey.Memory.protocol}://1234a@myDb/foo"
    val key = StorageKeyParser.parse(keyString) as? DatabaseStorageKey.Memory
      ?: fail("Expected a DatabaseStorageKey")
    assertThat(key.dbName).isEqualTo("myDb")
    assertThat(key.entitySchemaHash).isEqualTo("1234a")
    assertThat(key.unique).isEqualTo("foo")
  }

  @Test
  fun childKeyWithComponent_isCorrect_persistent() {
    val parent = DatabaseStorageKey.Persistent("parent", "1234a")
    val child = parent.childKeyWithComponent("child") as DatabaseStorageKey.Persistent
    assertThat(child.toString())
      .isEqualTo("${DatabaseStorageKey.Persistent.protocol}://${parent.toKeyString()}/child")
  }

  @Test
  fun childKeyWithComponent_isCorrect_memory() {
    val parent = DatabaseStorageKey.Memory("parent", "1234a")
    val child = parent.childKeyWithComponent("child") as DatabaseStorageKey.Memory
    assertThat(child.toString())
      .isEqualTo("${DatabaseStorageKey.Memory.protocol}://${parent.toKeyString()}/child")
  }
}
