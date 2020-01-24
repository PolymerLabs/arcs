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

package arcs.core.storage.driver

import arcs.core.storage.StorageKeyParser
import arcs.core.testutil.assertThrows
import arcs.core.testutil.fail
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class DatabaseStorageKeyTest {
    @Test
    fun toString_renders_correctly_persistent() {
        val key = DatabaseStorageKey("foo", "1234a", persistent = true, dbName = "myDb")
        assertThat(key.toString())
            .isEqualTo("$DATABASE_DRIVER_PROTOCOL://1234a@myDb:persistent/foo")
    }

    @Test
    fun toString_renders_correctly_nonPersistent() {
        val key = DatabaseStorageKey("foo", "1234a", persistent = false, dbName = "myDb")
        assertThat(key.toString())
            .isEqualTo("$DATABASE_DRIVER_PROTOCOL://1234a@myDb:in-memory/foo")
    }

    @Test
    fun fromString_parses_correctly_persistent() {
        val key = DatabaseStorageKey.fromString("1234a@myDb:persistent/foo")
        assertThat(key.unique).isEqualTo("foo")
        assertThat(key.entitySchemaHash).isEqualTo("1234a")
        assertThat(key.persistent).isTrue()
        assertThat(key.dbName).isEqualTo("myDb")
    }

    @Test
    fun fromString_parses_correctly_nonPersistent() {
        val key = DatabaseStorageKey.fromString("1234a@myDb:in-memory/foo")
        assertThat(key.unique).isEqualTo("foo")
        assertThat(key.entitySchemaHash).isEqualTo("1234a")
        assertThat(key.persistent).isFalse()
        assertThat(key.dbName).isEqualTo("myDb")
    }

    @Test
    fun requires_dbName_tohaveAtLeastOneAlphabeticalChar_asFirstChar() {
        val options = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
        options.forEach {
            DatabaseStorageKey("foo", "1234a", dbName = "$it")
        }

        val illegalStarters = "0123456789_-"
        illegalStarters.forEach {
            assertThrows(IllegalArgumentException::class) {
                DatabaseStorageKey("foo", "1234a", dbName = "${it}ThenLegal")
            }
        }
    }

    @Test
    fun requires_dbName_toHaveNoWeirdCharacters() {
        assertThrows(IllegalArgumentException::class) {
            DatabaseStorageKey("foo", "1234a", dbName = "no spaces")
        }

        assertThrows(IllegalArgumentException::class) {
            DatabaseStorageKey("foo", "1234a", dbName = "no:colons")
        }

        assertThrows(IllegalArgumentException::class) {
            DatabaseStorageKey("foo", "1234a", dbName = "slashes/arent/cool")
        }

        assertThrows(IllegalArgumentException::class) {
            DatabaseStorageKey("foo", "1234a", dbName = "periods.shouldnt.be.allowed")
        }
    }

    @Test
    fun requires_entitySchemaHash_toBeValidHexString() {
        assertThrows(IllegalArgumentException::class) {
            DatabaseStorageKey("foo", "", dbName = "myDb")
        }

        assertThrows(IllegalArgumentException::class) {
            DatabaseStorageKey("foo", "g", dbName = "myDb")
        }

        assertThrows(IllegalArgumentException::class) {
            DatabaseStorageKey("foo", "1234a_", dbName = "myDb")
        }
    }

    @Test
    fun registers_self_withParser() {
        val keyString = "$DATABASE_DRIVER_PROTOCOL://1234a@myDb:persistent/foo"
        val key = StorageKeyParser.parse(keyString) as? DatabaseStorageKey
            ?: fail("Expected a DatabaseStorageKey")
        assertThat(key.dbName).isEqualTo("myDb")
        assertThat(key.persistent).isTrue()
        assertThat(key.entitySchemaHash).isEqualTo("1234a")
        assertThat(key.unique).isEqualTo("foo")
    }

    @Test
    fun childKeyWithComponent_isCorrect() {
        val parent = DatabaseStorageKey("parent", "1234a")
        val child = parent.childKeyWithComponent("child") as DatabaseStorageKey
        assertThat(child.toString())
            .isEqualTo("$DATABASE_DRIVER_PROTOCOL://${parent.toKeyString()}/child")
    }
}
