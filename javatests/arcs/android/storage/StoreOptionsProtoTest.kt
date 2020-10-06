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

package arcs.android.storage

import arcs.core.data.TypeVariable
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.StoreOptions
import arcs.core.storage.testutil.DummyStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class StoreOptionsProtoTest {
  @Before
  fun setUp() {
    StorageKeyParser.addParser(DummyStorageKey)
  }

  @Test
  fun roundTrip_withoutVersionToken() {
    val options = StoreOptions(
      storageKey = DummyStorageKey("abc"),
      type = TypeVariable("a"),
      versionToken = null
    )
    assertThat(options.toProto().decode()).isEqualTo(options)
  }

  @Test
  fun roundTrip_withVersionToken() {
    val options = StoreOptions(
      storageKey = DummyStorageKey("abc"),
      type = TypeVariable("a"),
      versionToken = "v12"
    )
    assertThat(options.toProto().decode()).isEqualTo(options)
  }

  @Test
  fun decodeStoreOptions() {
    val options = StoreOptions(
      storageKey = DummyStorageKey("abc"),
      type = TypeVariable("a"),
      versionToken = "v12"
    )

    assertThat(options.toProto().toByteArray().decodeStoreOptions()).isEqualTo(options)
  }
}
