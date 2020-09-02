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

package arcs.core.data

import arcs.core.storage.StorageKeyParser
import arcs.core.storage.api.DriverAndKeyConfigurator
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CreatableStorageKeyTest]. */
@RunWith(JUnit4::class)
class CreatableStorageKeyTest {

    @Before
    fun registerParsers() = DriverAndKeyConfigurator.configureKeyParsers()

    @Test
    fun serializesToString() {
        assertThat(CreatableStorageKey("abc").toString()).isEqualTo("create://abc")
    }

    @Test
    fun parsesFromString() {
        val name = "abc"
        val storageKey = StorageKeyParser.parse("create://$name")
        assertThat(storageKey).isInstanceOf(CreatableStorageKey::class.java)
        storageKey as CreatableStorageKey
        assertThat(storageKey.nameFromManifest).isEqualTo(name)
    }

    @Test
    fun serializationRoundTrip() {
        val name = "recipePerson"

        val key = CreatableStorageKey(name)
        val parsedKey = StorageKeyParser.parse(key.toString())
        assertThat(parsedKey).isEqualTo(key)
    }
}
