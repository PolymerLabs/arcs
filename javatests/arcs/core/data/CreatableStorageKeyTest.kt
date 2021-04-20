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

import arcs.core.storage.StorageKeyManager
import arcs.core.storage.StorageKeyProtocol
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

/** Tests for [CreatableStorageKeyTest]. */
@RunWith(Parameterized::class)
class CreatableStorageKeyTest(parameters: ParameterizedBuildFlags) {

  @get:Rule
  val buildFlagsRule = BuildFlagsRule.parameterized(parameters)

  @Before
  fun registerParsers() = DriverAndKeyConfigurator.configureKeyParsersAndFactories()

  @Test
  fun serializesToString() {
    assertThat(CreatableStorageKey("abc").toString())
      .isEqualTo("${StorageKeyProtocol.Create.protocol}abc")
  }

  @Test
  fun parsesFromString() {
    val name = "abc"
    val storageKey = StorageKeyManager.GLOBAL_INSTANCE.parse(
      "${StorageKeyProtocol.Create.protocol}$name"
    )
    assertThat(storageKey).isInstanceOf(CreatableStorageKey::class.java)
    storageKey as CreatableStorageKey
    assertThat(storageKey.nameFromManifest).isEqualTo(name)
  }

  @Test
  fun serializationRoundTrip() {
    val name = "recipePerson"

    val key = CreatableStorageKey(name)
    val parsedKey = StorageKeyManager.GLOBAL_INSTANCE.parse(key.toString())
    assertThat(parsedKey).isEqualTo(key)
  }

  private companion object {
    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS = ParameterizedBuildFlags.of("STORAGE_KEY_REDUCTION")
  }
}
