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

import arcs.core.common.ArcId
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.type.Tag
import arcs.core.type.Type
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [RamDiskDriverProvider]. */
@RunWith(JUnit4::class)
class RamDiskDriverProviderTest {

  private val provider = RamDiskDriverProvider()

  @After
  fun teardown() = runBlocking {
    CapabilitiesResolver.reset()
    RamDisk.clear()
  }

  @Test
  fun differentInstances_treatedAsEqual() {
    val providerA = RamDiskDriverProvider()
    val providerB = RamDiskDriverProvider()

    assertThat(providerA).isEqualTo(providerB)
    assertThat(providerA.hashCode()).isEqualTo(providerB.hashCode())
  }

  @Test
  fun willSupport_returnsTrue_whenRamDiskKey() {
    val key = RamDiskStorageKey("foo")
    assertThat(provider.willSupport(key)).isTrue()
  }

  @Test
  fun willSupport_returnsFalse_whenNotRamDiskKey() {
    val volatile = VolatileStorageKey(ArcId.newForTest("myarc"), "foo")
    val other = object : StorageKey("outofnowhere") {
      override fun toKeyString(): String = "something"
      override fun childKeyWithComponent(component: String): StorageKey = this
    }

    assertThat(provider.willSupport(volatile)).isFalse()
    assertThat(provider.willSupport(other)).isFalse()
  }

  @Test(expected = IllegalArgumentException::class)
  fun getDriver_throwsOnInvalidKey() = runBlocking {
    val volatile = VolatileStorageKey(ArcId.newForTest("myarc"), "foo")

    provider.getDriver(volatile, Int::class, DummyType)
    Unit
  }

  @Test
  fun drivers_shareTheSameData() = runBlocking {
    val provider2 = RamDiskDriverProvider()

    val key = RamDiskStorageKey("foo")

    val driver1 = provider.getDriver(key, Int::class, DummyType)
    val driver2 = provider.getDriver(key, Int::class, DummyType)
    val driver3 = provider2.getDriver(key, Int::class, DummyType)

    var driver2Value: Int? = null
    var driver2Version: Int? = null
    driver2.registerReceiver(driver2.token) { value, version ->
      driver2Value = value
      driver2Version = version
    }

    var driver3Value: Int? = null
    var driver3Version: Int? = null
    driver3.registerReceiver(driver3.token) { value, version ->
      driver3Value = value
      driver3Version = version
    }

    driver1.send(42, 1)

    assertThat(driver2Value).isEqualTo(42)
    assertThat(driver2Version).isEqualTo(1)
    assertThat(driver3Value).isEqualTo(42)
    assertThat(driver3Version).isEqualTo(1)
  }

  @Test
  fun removeAllEntities() = runBlocking {
    val key = RamDiskStorageKey("foo")
    val driver = provider.getDriver(key, Int::class, DummyType)
    driver.send(42, 1)

    provider.removeAllEntities()

    // Receiver are not updated, so check memory directly.
    assertThat(RamDisk.memory.contains(key)).isFalse()
  }

  @Test
  fun removeEntitiesBetween() = runBlocking {
    val key = RamDiskStorageKey("foo")
    val driver = provider.getDriver(key, Int::class, DummyType)
    driver.send(42, 1)

    provider.removeEntitiesCreatedBetween(1, 2)

    // Receiver are not updated, so check memory directly.
    assertThat(RamDisk.memory.contains(key)).isFalse()
  }

  companion object {
    object DummyType : Type {
      override val tag = Tag.Count
    }
  }
}
