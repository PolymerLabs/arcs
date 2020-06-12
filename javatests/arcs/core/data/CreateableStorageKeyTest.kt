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

/** Tests for [CreateableStorageKeyTest]. */
@RunWith(JUnit4::class)
class CreateableStorageKeyTest {

    @Before
    fun registerParsers() = DriverAndKeyConfigurator.configureKeyParsers()

    @Test
    fun serializesToString() {
        assertThat(
            CreateableStorageKey("abc", Capabilities.Empty).toString()
        ).isEqualTo("create://abc")

        assertThat(
            CreateableStorageKey("abc", Capabilities.TiedToArc).toString()
        ).isEqualTo("create://abc?TiedToArc")

        assertThat(
            CreateableStorageKey("abc", Capabilities.PersistentQueryable).toString()
        ).isEqualTo("create://abc?Persistent,Queryable")
    }

    @Test
    fun parsesFromString() {
        val name = "abc"

        run {
            val storageKey = StorageKeyParser.parse("create://$name")
            assertThat(storageKey).isInstanceOf(CreateableStorageKey::class.java)
            storageKey as CreateableStorageKey
            assertThat(storageKey.nameFromManifest).isEqualTo(name)
            assertThat(storageKey.capabilities.isEmpty()).isTrue()
        }

        run {
            val storageKey = StorageKeyParser.parse("create://$name?")
            assertThat(storageKey).isInstanceOf(CreateableStorageKey::class.java)
            storageKey as CreateableStorageKey
            assertThat(storageKey.nameFromManifest).isEqualTo(name)
            assertThat(storageKey.capabilities.isEmpty()).isTrue()
        }

        run {
            val storageKey = StorageKeyParser.parse("create://$name?TiedToRuntime")
            assertThat(storageKey).isInstanceOf(CreateableStorageKey::class.java)
            storageKey as CreateableStorageKey
            assertThat(storageKey.nameFromManifest).isEqualTo(name)
            assertThat(storageKey.capabilities.isPersistent).isFalse()
            assertThat(storageKey.capabilities.isQueryable).isFalse()
            assertThat(storageKey.capabilities.isTiedToArc).isFalse()
            assertThat(storageKey.capabilities.isTiedToRuntime).isTrue()
        }

        run {
            val storageKey = StorageKeyParser.parse("create://$name?Persistent,Queryable")
            assertThat(storageKey).isInstanceOf(CreateableStorageKey::class.java)
            storageKey as CreateableStorageKey
            assertThat(storageKey.nameFromManifest).isEqualTo(name)
            assertThat(storageKey.capabilities.isPersistent).isTrue()
            assertThat(storageKey.capabilities.isQueryable).isTrue()
            assertThat(storageKey.capabilities.isTiedToArc).isFalse()
            assertThat(storageKey.capabilities.isTiedToRuntime).isFalse()
        }
    }

    @Test
    fun serializationRoundTrip() {
        val name = "recipePerson"

        run {
            val key = CreateableStorageKey(name, Capabilities.Persistent)
            val parsedKey = StorageKeyParser.parse(key.toString())
            assertThat(parsedKey).isEqualTo(key)
        }

        run {
            val noCapKey = CreateableStorageKey(name, Capabilities(setOf()))
            val parsedNoCapKey = StorageKeyParser.parse(noCapKey.toString())
            parsedNoCapKey as CreateableStorageKey
            assertThat(parsedNoCapKey).isEqualTo(noCapKey)
        }

        run {
            val multiCapKey = CreateableStorageKey(name, Capabilities(setOf(
                Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc
            )))
            val parsedMultiCapKey = StorageKeyParser.parse(multiCapKey.toString())
            assertThat(parsedMultiCapKey).isEqualTo(multiCapKey)
        }
    }

    @Test
    fun keyWithoutCapabilitiesButWithSeparatorIsNormalized() {
        val key = StorageKeyParser.parse("create://abc?")
        assertThat(key.toString()).isEqualTo("create://abc")
    }
}
