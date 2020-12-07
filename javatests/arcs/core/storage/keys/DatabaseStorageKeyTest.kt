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
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class DatabaseStorageKeyTest {
  @Before
  fun setUp() {
    StorageKeyParser.addParser(DatabaseStorageKey.Memory)
    StorageKeyParser.addParser(DatabaseStorageKey.Persistent)
  }

  @Test
  fun toString_persistent_rendersCorrectly() {
    val key = DatabaseStorageKey.Persistent("foo", "1234a", dbName = "myDb")
    assertThat(key.toString())
      .isEqualTo("${DatabaseStorageKey.Persistent.protocol}://1234a@myDb/foo")
  }

  @Test
  fun toString_memory_rendersCorrectly() {
    val key = DatabaseStorageKey.Memory("foo", "1234a", dbName = "myDb")
    assertThat(key.toString())
      .isEqualTo("${DatabaseStorageKey.Memory.protocol}://1234a@myDb/foo")
  }

  @Test
  fun persistentParse_validString_parsesCorrectly() {
    val key = DatabaseStorageKey.Persistent.parse("1234a@myDb/foo")
    assertThat(key).isInstanceOf(DatabaseStorageKey.Persistent::class.java)
    assertThat(key.unique).isEqualTo("foo")
    assertThat(key.entitySchemaHash).isEqualTo("1234a")
    assertThat(key.dbName).isEqualTo("myDb")
  }

  @Test
  fun memoryParse_validString_parsesCorrectly() {
    val key = DatabaseStorageKey.Memory.parse("1234a@myDb/foo")
    assertThat(key).isInstanceOf(DatabaseStorageKey.Memory::class.java)
    assertThat(key.unique).isEqualTo("foo")
    assertThat(key.entitySchemaHash).isEqualTo("1234a")
    assertThat(key.dbName).isEqualTo("myDb")
  }

  @Test
  fun memoryParse_malformedString_throws() {
    assertFailsWith<IllegalArgumentException>("no @ sign") {
      DatabaseStorageKey.Memory.parse("1234:myDB/foo")
    }
    assertFailsWith<IllegalArgumentException>("no / sign") {
      DatabaseStorageKey.Memory.parse("1234@myDB:foo")
    }

    assertFailsWith<IllegalArgumentException>("non-hex entity schema hash") {
      DatabaseStorageKey.Memory.parse("1234defg@myDB/foo")
    }
    assertFailsWith<IllegalArgumentException>("db name doesn't start with letter") {
      DatabaseStorageKey.Memory.parse("1234def@_myDB/foo")
    }

    assertFailsWith<IllegalArgumentException>("missing entity schema hash") {
      DatabaseStorageKey.Memory.parse("@myDB/foo")
    }
    assertFailsWith<IllegalArgumentException>("missing db name") {
      DatabaseStorageKey.Memory.parse("1234@/foo")
    }
    assertFailsWith<IllegalArgumentException>("missing unique") {
      DatabaseStorageKey.Memory.parse("1234@myDB/")
    }
  }

  @Test
  fun persistentConstructor_withAtLeastOneAlphabeticalFirstChar_parsesCorrectly() {
    val options = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    options.forEach {
      DatabaseStorageKey.Persistent("foo", "1234a", "$it")
    }
  }

  @Test
  fun persistentConstructor_withNonAlphabeticalFirstChar_throws() {
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
  fun persistentConstructor_dbNameWithWeirdCharacters_throws() {
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
  fun persistentConstructor_withInvalidEntitySchemaHashHexString_throws() {
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
  fun persistentParse_viaRegistration_parsesCorrectly() {
    val keyString = "${DatabaseStorageKey.Persistent.protocol}://1234a@myDb/foo"
    val key = StorageKeyParser.parse(keyString) as? DatabaseStorageKey.Persistent
      ?: fail("Expected a DatabaseStorageKey")
    assertThat(key.dbName).isEqualTo("myDb")
    assertThat(key.entitySchemaHash).isEqualTo("1234a")
    assertThat(key.unique).isEqualTo("foo")
  }

  @Test
  fun memoryParse_viaRegistration_parsesCorrectly() {
    val keyString = "${DatabaseStorageKey.Memory.protocol}://1234a@myDb/foo"
    val key = StorageKeyParser.parse(keyString) as? DatabaseStorageKey.Memory
      ?: fail("Expected a DatabaseStorageKey")
    assertThat(key.dbName).isEqualTo("myDb")
    assertThat(key.entitySchemaHash).isEqualTo("1234a")
    assertThat(key.unique).isEqualTo("foo")
  }

  @Test
  fun childKeyWithComponent_persistent_isCorrect() {
    val parent = DatabaseStorageKey.Persistent("parent", "1234a")
    val child = parent.childKeyWithComponent("child") as DatabaseStorageKey.Persistent
    assertThat(child.toString())
      .isEqualTo("${DatabaseStorageKey.Persistent.protocol}://${parent.toKeyString()}/child")
  }

  @Test
  fun childKeyWithComponent_memory_isCorrect() {
    val parent = DatabaseStorageKey.Memory("parent", "1234a")
    val child = parent.childKeyWithComponent("child") as DatabaseStorageKey.Memory
    assertThat(child.toString())
      .isEqualTo("${DatabaseStorageKey.Memory.protocol}://${parent.toKeyString()}/child")
  }
}
