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
        val key = DatabaseStorageKey("foo", persistent = true, dbName = "myDb")
        assertThat(key.toString()).isEqualTo("$DATABASE_DRIVER_PROTOCOL://myDb:persistent/foo")
    }

    @Test
    fun toString_renders_correctly_nonPersistent() {
        val key = DatabaseStorageKey("foo", persistent = false, dbName = "myDb")
        assertThat(key.toString()).isEqualTo("$DATABASE_DRIVER_PROTOCOL://myDb:in-memory/foo")
    }

    @Test
    fun fromString_parses_correctly_persistent() {
        val key = DatabaseStorageKey.fromString("myDb:persistent/foo")
        assertThat(key.unique).isEqualTo("foo")
        assertThat(key.persistent).isTrue()
        assertThat(key.dbName).isEqualTo("myDb")
    }

    @Test
    fun fromString_parses_correctly_nonPersistent() {
        val key = DatabaseStorageKey.fromString("myDb:in-memory/foo")
        assertThat(key.unique).isEqualTo("foo")
        assertThat(key.persistent).isFalse()
        assertThat(key.dbName).isEqualTo("myDb")
    }

    @Test
    fun requires_dbName_tohaveAtLeastOneAlphabeticalChar_asFirstChar() {
        val options = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
        options.forEach {
            DatabaseStorageKey("foo", dbName = "$it")
        }

        val illegalStarters = "0123456789_-"
        illegalStarters.forEach {
            assertThrows(IllegalArgumentException::class) {
                DatabaseStorageKey("foo", dbName = "${it}ThenLegal")
            }
        }
    }

    @Test
    fun requires_dbName_toHaveNoWeirdCharacters() {
        assertThrows(IllegalArgumentException::class) {
            DatabaseStorageKey("foo", dbName = "no spaces")
        }

        assertThrows(IllegalArgumentException::class) {
            DatabaseStorageKey("foo", dbName = "no:colons")
        }

        assertThrows(IllegalArgumentException::class) {
            DatabaseStorageKey("foo", dbName = "slashes/arent/cool")
        }

        assertThrows(IllegalArgumentException::class) {
            DatabaseStorageKey("foo", dbName = "periods.shouldnt.be.allowed")
        }
    }

    @Test
    fun registers_self_withParser() {
        val keyString = "$DATABASE_DRIVER_PROTOCOL://myDb:persistent/foo"
        val key = StorageKeyParser.parse(keyString) as? DatabaseStorageKey
            ?: fail("Expected a DatabaseStorageKey")
        assertThat(key.dbName).isEqualTo("myDb")
        assertThat(key.persistent).isTrue()
        assertThat(key.unique).isEqualTo("foo")
    }

    @Test
    fun childKeyWithComponent_isCorrect() {
        val parent = DatabaseStorageKey("parent")
        val child = parent.childKeyWithComponent("child") as DatabaseStorageKey
        assertThat(child.toString())
            .isEqualTo("$DATABASE_DRIVER_PROTOCOL://${parent.toKeyString()}/child")
    }
}
