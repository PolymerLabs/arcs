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
import com.google.common.truth.TruthJUnit.assume
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@RunWith(Parameterized::class)
class DatabaseStorageKeyTest(parameters: ParameterizedBuildFlags) {

  @get:Rule
  val buildFlagsRule = BuildFlagsRule.parameterized(parameters)

  @Before
  fun setUp() {
    StorageKeyManager.GLOBAL_INSTANCE.addParser(DatabaseStorageKey.Memory)
    StorageKeyManager.GLOBAL_INSTANCE.addParser(DatabaseStorageKey.Persistent)
  }

  @Test
  fun toString_persistent_rendersCorrectly() {
    val keyStr = DatabaseStorageKey.Persistent("foo", "1234a", dbName = "myDb").toString()
    if (BuildFlags.STORAGE_KEY_REDUCTION) {
      assertThat(keyStr).isEqualTo("${StorageKeyProtocol.Database.protocol}myDb/foo")
    } else {
      assertThat(keyStr).isEqualTo("${StorageKeyProtocol.Database.protocol}1234a@myDb/foo")
    }
  }

  @Test
  fun toString_memory_rendersCorrectly() {
    val keyStr = DatabaseStorageKey.Memory("foo", "1234a", dbName = "myDb").toString()
    if (BuildFlags.STORAGE_KEY_REDUCTION) {
      assertThat(keyStr).isEqualTo("${StorageKeyProtocol.InMemoryDatabase.protocol}myDb/foo")
    } else {
      assertThat(keyStr).isEqualTo("${StorageKeyProtocol.InMemoryDatabase.protocol}1234a@myDb/foo")
    }
  }

  @Test
  fun persistentParse_validString_parsesCorrectly() {
    val key = DatabaseStorageKey.Persistent.parse("1234a@myDb/foo")
    assertThat(key).isInstanceOf(DatabaseStorageKey.Persistent::class.java)
    assertThat(key).isEqualTo(
      DatabaseStorageKey.Persistent(
        unique = "foo",
        entitySchemaHash = "1234a",
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
        entitySchemaHash = "1234a",
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
  fun persistentConstructor_flagOff_invalidEntitySchemaHashHexString_throws() {
    assume().that(BuildFlags.STORAGE_KEY_REDUCTION).isFalse()

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "", "myDb")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "g", "myDb")
    }

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent("foo", "1234a_", "myDb")
    }
  }

  @Test
  fun memoryConstructor_flagOff_invalidEntitySchemaHashHexString_throws() {
    assume().that(BuildFlags.STORAGE_KEY_REDUCTION).isFalse()

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
    val keyString = "${StorageKeyProtocol.Database.protocol}1234a@myDb/foo"
    val key = StorageKeyManager.GLOBAL_INSTANCE.parse(keyString)
    assertThat(key).isEqualTo(
      DatabaseStorageKey.Persistent(
        unique = "foo",
        entitySchemaHash = "1234a",
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
        entitySchemaHash = "1234a",
        dbName = "myDb"
      )
    )
  }

  @Test
  fun newKeyWithComponent_persistent() {
    val parent = DatabaseStorageKey.Persistent("parent", "1234a")
    val child = parent.newKeyWithComponent("child") as DatabaseStorageKey.Persistent
    val expected = if (BuildFlags.STORAGE_KEY_REDUCTION) "child" else "parent/child"
    assertThat(child).isEqualTo(DatabaseStorageKey.Persistent(expected, "1234a"))
  }

  @Test
  fun newKeyWithComponent_memory() {
    val parent = DatabaseStorageKey.Memory("parent", "1234a")
    val child = parent.newKeyWithComponent("child") as DatabaseStorageKey.Memory
    val expected = if (BuildFlags.STORAGE_KEY_REDUCTION) "child" else "parent/child"
    assertThat(child).isEqualTo(DatabaseStorageKey.Memory(expected, "1234a"))
  }

  @Test
  fun parseMemory_flagOff_rejectsShortFormat() {
    assume().that(BuildFlags.STORAGE_KEY_REDUCTION).isFalse()

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Memory.parse("myDB/foo")
    }
  }

  @Test
  fun parsePersistent_flagOff_rejectsShortFormat() {
    assume().that(BuildFlags.STORAGE_KEY_REDUCTION).isFalse()

    assertFailsWith<IllegalArgumentException> {
      DatabaseStorageKey.Persistent.parse("myDB/foo")
    }
  }

  @Test
  fun parseMemory_flagOn_acceptsShortFormat() {
    assume().that(BuildFlags.STORAGE_KEY_REDUCTION).isTrue()

    assertThat(DatabaseStorageKey.Memory.parse("myDB/foo")).isEqualTo(
      DatabaseStorageKey.Memory("foo", SCHEMA_HASH_NOT_REQUIRED, "myDB")
    )
  }

  @Test
  fun parsePersistent_flagOn_acceptsShortFormat() {
    assume().that(BuildFlags.STORAGE_KEY_REDUCTION).isTrue()

    assertThat(DatabaseStorageKey.Persistent.parse("myDB/foo")).isEqualTo(
      DatabaseStorageKey.Persistent("foo", SCHEMA_HASH_NOT_REQUIRED, "myDB")
    )
  }

  @Test
  fun entitySchemaHash_memory_flagOff_returnsValue() {
    assume().that(BuildFlags.STORAGE_KEY_REDUCTION).isFalse()

    val key = DatabaseStorageKey.Memory("foo", "1234a", "myDB")
    assertThat(key.entitySchemaHash).isEqualTo("1234a")
  }

  @Test
  fun entitySchemaHash_persistent_flagOff_returnsValue() {
    assume().that(BuildFlags.STORAGE_KEY_REDUCTION).isFalse()

    val key = DatabaseStorageKey.Persistent("foo", "1234a", "myDB")
    assertThat(key.entitySchemaHash).isEqualTo("1234a")
  }

  @Test
  fun entitySchemaHash_memory_flagOn_throws() {
    assume().that(BuildFlags.STORAGE_KEY_REDUCTION).isTrue()

    val key = DatabaseStorageKey.Memory("foo", "1234a", "myDB")
    assertFailsWith<IllegalStateException> { key.entitySchemaHash }
  }

  @Test
  fun entitySchemaHash_persistent_flagOn_throws() {
    assume().that(BuildFlags.STORAGE_KEY_REDUCTION).isTrue()

    val key = DatabaseStorageKey.Persistent("foo", "1234a", "myDB")
    assertFailsWith<IllegalStateException> { key.entitySchemaHash }
  }

  private companion object {
    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS = ParameterizedBuildFlags.of("STORAGE_KEY_REDUCTION")

    private const val SCHEMA_HASH_NOT_REQUIRED = "SCHEMA_HASH_NOT_REQUIRED"
  }
}
