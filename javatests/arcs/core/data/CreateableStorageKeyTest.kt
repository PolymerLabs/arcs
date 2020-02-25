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
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CreateableStorageKeyTest]. */
@RunWith(JUnit4::class)
class CreateableStorageKeyTest {

    @Test
    fun createableStorageKey_parses() {
        val name = "recipePerson"
        val key = CreateableStorageKey(name, Capabilities.Persistent)
        val parsedKey = StorageKeyParser.parse(key.toString())
        assertThat(parsedKey).isInstanceOf(CreateableStorageKey::class.java)
        assertThat(parsedKey).isEqualTo(key)
        parsedKey as CreateableStorageKey
        assertThat(parsedKey.capabilities.isPersistent).isTrue()
        assertThat(parsedKey.capabilities.isTiedToArc).isFalse()
        assertThat(parsedKey.capabilities.isTiedToRuntime).isFalse()

        val noCapKey = CreateableStorageKey(name, Capabilities(setOf<Capabilities.Capability>()))
        val parsedNoCapKey = StorageKeyParser.parse(noCapKey.toString())
        parsedNoCapKey as CreateableStorageKey
        assertThat(parsedNoCapKey).isEqualTo(noCapKey)
        assertThat(parsedNoCapKey.capabilities.isEmpty()).isTrue()

        val multiCapKey = CreateableStorageKey(name, Capabilities(setOf<Capabilities.Capability>(
            Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc
        )))

        val parsedMultiCapKey = StorageKeyParser.parse(multiCapKey.toString())
        parsedMultiCapKey as CreateableStorageKey
        assertThat(parsedMultiCapKey).isEqualTo(multiCapKey)
        assertThat(parsedMultiCapKey.capabilities.isPersistent).isTrue()
        assertThat(parsedMultiCapKey.capabilities.isTiedToArc).isTrue()
        assertThat(parsedMultiCapKey.capabilities.isTiedToRuntime).isFalse()
    }
}
