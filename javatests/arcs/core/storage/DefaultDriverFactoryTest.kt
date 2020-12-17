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
package arcs.core.storage

import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.storage.testutil.FakeDriverProvider
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.mock
import org.junit.Before
import org.junit.Test

class DefaultDriverFactoryTest {
  @Before
  fun setup() {
    DefaultDriverFactory.update()
  }

  @Test
  fun update_withNoArgs_setsEmptyProvider() {
    DefaultDriverFactory.update(DUMMY_DRIVER_PROVIDER_1)

    DefaultDriverFactory.update()

    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_1)).isFalse()
    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_2)).isFalse()
    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_3)).isFalse()
  }

  @Test
  fun get_forListOfProviders_returnsFixedDriverFactory_withSpecifiedProviders() {
    DefaultDriverFactory.update(listOf(DUMMY_DRIVER_PROVIDER_1, DUMMY_DRIVER_PROVIDER_2))

    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_1)).isTrue()
    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_2)).isTrue()
    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_3)).isFalse()
  }

  @Test
  fun get_forVarargProviders_returnsFixedDriverFactory_withSpecifiedProviders() {
    DefaultDriverFactory.update(DUMMY_DRIVER_PROVIDER_1, DUMMY_DRIVER_PROVIDER_2)

    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_1)).isTrue()
    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_2)).isTrue()
    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_3)).isFalse()
  }

  @Test
  fun get_forListOfProviders_returnsFixedDriverFactory_withNewProviders() {
    DefaultDriverFactory.update(listOf(DUMMY_DRIVER_PROVIDER_1, DUMMY_DRIVER_PROVIDER_2))

    DefaultDriverFactory.update(listOf(DUMMY_DRIVER_PROVIDER_1, DUMMY_DRIVER_PROVIDER_3))

    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_1)).isTrue()
    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_2)).isFalse()
    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_3)).isTrue()
  }

  @Test
  fun get_forVarargProviders_returnsFixedDriverFactory_withNewProviders() {
    DefaultDriverFactory.update(DUMMY_DRIVER_PROVIDER_1, DUMMY_DRIVER_PROVIDER_2)

    DefaultDriverFactory.update(DUMMY_DRIVER_PROVIDER_1, DUMMY_DRIVER_PROVIDER_3)

    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_1)).isTrue()
    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_2)).isFalse()
    assertThat(DefaultDriverFactory.get().willSupport(DUMMY_STORAGE_KEY_3)).isTrue()
  }

  @Test
  fun get_withoutUpdate_returnsSameInstance() {
    DefaultDriverFactory.update(DUMMY_DRIVER_PROVIDER_1)
    val firstGetResult = DefaultDriverFactory.get()

    assertThat(DefaultDriverFactory.get()).isSameInstanceAs(firstGetResult)
  }

  @Test
  fun update_createsNewFactoryInstance() {
    DefaultDriverFactory.update(DUMMY_DRIVER_PROVIDER_1)
    val firstProvider = DefaultDriverFactory.get()

    DefaultDriverFactory.update(DUMMY_DRIVER_PROVIDER_1)

    assertThat(DefaultDriverFactory.get()).isNotSameInstanceAs(firstProvider)
  }

  companion object {
    private val DUMMY_STORAGE_KEY_1 = DummyStorageKey("storageKey1")
    private val DUMMY_STORAGE_KEY_2 = DummyStorageKey("storageKey2")
    private val DUMMY_STORAGE_KEY_3 = DummyStorageKey("storageKey3")

    val DUMMY_DRIVER_PROVIDER_1 = FakeDriverProvider(DUMMY_STORAGE_KEY_1 to mock())
    val DUMMY_DRIVER_PROVIDER_2 = FakeDriverProvider(DUMMY_STORAGE_KEY_2 to mock())
    val DUMMY_DRIVER_PROVIDER_3 = FakeDriverProvider(DUMMY_STORAGE_KEY_3 to mock())
  }
}
