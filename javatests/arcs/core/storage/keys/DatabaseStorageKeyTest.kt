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
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class DatabaseStorageKeyTest() {

  @Before
  fun setUp() {
    StorageKeyManager.GLOBAL_INSTANCE.addParser(DatabaseStorageKey.Memory)
    StorageKeyManager.GLOBAL_INSTANCE.addParser(DatabaseStorageKey.Persistent)
  }

  @Test
  fun toString_persistent_rendersCorrectly() {
    val keyStr = DatabaseStorageKey.Persistent("foo", dbName = "myDb").toString()
    assertThat(keyStr).isEqualTo("${StorageKeyProtocol.Database.protocol}myDb/foo")
  }

  @Test
  fun toString_memory_rendersCorrectly() {
    val keyStr = DatabaseStorageKey.Memory("foo", dbName = "myDb").toString()
    assertThat(keyStr).isEqualTo("${StorageKeyProtocol.InMemoryDatabase.protocol}myDb/foo")
  }

  @Test
  fun persistentParse_validString_parsesCorrectly() {
    val key = DatabaseStorageKey.Persistent.parse("1234a@myDb/foo")
    assertThat(key).isInstanceOf(DatabaseStorageKey.Persistent::class.java)
    assertThat(key).isEqualTo(
      DatabaseStorageKey.Persistent(
        unique = "foo",
        dbName = "myDb"
      )
    )
  }

  @Test
  fun memoryParse_validString_parsesCorrectly() {
    val key = DatabaseStorageKey.Memory.parse("1234a@myDb/foo")
    assertThat(key).isInstanceOf(DatabaseStorageKey.Memory::class.java)
    assertThat(key).isEqualTo(
      DatabaseStorageKey.Memory(
        unique = "foo",
        dbName = "myDb"
      )
    )
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
      DatabaseStorageKey.Persistent("foo", "$it")
    }
  }

  @Test
  fun persistentConstructor_withNonAlphabeticalFirstChar_throws() {
    val illegalStarters = "0123456789_-"
    illegalStarters.forEach {
      assertFailsWith<IllegalArgumentException> {
        DatabaseStorageKey.Persistent("foo", "${it}ThenLegal")
      }
      assertFailsWith<IllegalArgumentException> {
        DatabaseStorageKey.Memory("foo", "${it}ThenLegal")
      }
    }
  }

  @Test
  fun persistentConstructor_dbNameWithWeirdCharacters_throws() {
    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "no spaces")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "no:colons")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "slashes/arent/cool")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "periods.shouldnt.be.allowed")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory("foo", "no spaces")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory("foo", "no:colons")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory("foo", "slashes/arent/cool")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory("foo", "periods.shouldnt.be.allowed")
    }
  }

  @Test
  fun persistentParse_viaRegistration_parsesCorrectly() {
    val keyString = "${StorageKeyProtocol.Database.protocol}1234a@myDb/foo"
    val key = StorageKeyManager.GLOBAL_INSTANCE.parse(keyString)
    assertThat(key).isEqualTo(
      DatabaseStorageKey.Persistent(
        unique = "foo",
        dbName = "myDb"
      )
    )
  }

  @Test
  fun memoryParse_viaRegistration_parsesCorrectly() {
    val keyString = "${StorageKeyProtocol.InMemoryDatabase.protocol}1234a@myDb/foo"
    val key = StorageKeyManager.GLOBAL_INSTANCE.parse(keyString)
    assertThat(key).isEqualTo(
      DatabaseStorageKey.Memory(
        unique = "foo",
        dbName = "myDb"
      )
    )
  }

  @Test
  fun newKeyWithComponent_persistent() {
    val parent = DatabaseStorageKey.Persistent("parent")
    val child = parent.newKeyWithComponent("child") as DatabaseStorageKey.Persistent
    assertThat(child).isEqualTo(DatabaseStorageKey.Persistent("child"))
  }

  @Test
  fun newKeyWithComponent_memory() {
    val parent = DatabaseStorageKey.Memory("parent")
    val child = parent.newKeyWithComponent("child") as DatabaseStorageKey.Memory
    assertThat(child).isEqualTo(DatabaseStorageKey.Memory("child"))
  }

  @Test
  fun parseMemory_acceptsShortFormat() {
    assertThat(DatabaseStorageKey.Memory.parse("myDB/foo")).isEqualTo(
      DatabaseStorageKey.Memory("foo", "myDB")
    )
  }

  @Test
  fun parsePersistent_acceptsShortFormat() {
    assertThat(DatabaseStorageKey.Persistent.parse("myDB/foo")).isEqualTo(
      DatabaseStorageKey.Persistent("foo", "myDB")
    )
  }
}
