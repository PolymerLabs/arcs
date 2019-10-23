/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.storage.driver

import arcs.common.ArcId
import arcs.storage.Driver.ExistenceCriteria
import arcs.storage.StorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [RamDiskDriverProvider]. */
@RunWith(JUnit4::class)
class RamDiskDriverProviderTest {
  @Test
  fun willSupport_returnsTrue_whenRamDiskKey() {
    val provider = RamDiskDriverProvider()
    val key = RamDiskStorageKey("foo")
    assertThat(provider.willSupport(key)).isTrue()
  }

  @Test
  fun willSupport_returnsFalse_whenNotRamDiskKey() {
    val provider = RamDiskDriverProvider()
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
    val provider = RamDiskDriverProvider()
    val volatile = VolatileStorageKey(ArcId.newForTest("myarc"), "foo")

    provider.getDriver<Int>(volatile, ExistenceCriteria.ShouldCreate)
    Unit
  }

  @Test
  fun drivers_shareTheSameData() = runBlocking {
    val provider1 = RamDiskDriverProvider()
    val provider2 = RamDiskDriverProvider()

    val key = RamDiskStorageKey("foo")

    val driver1 = provider1.getDriver<Int>(key, ExistenceCriteria.MayExist)
    val driver2 = provider1.getDriver<Int>(key, ExistenceCriteria.MayExist)
    val driver3 = provider2.getDriver<Int>(key, ExistenceCriteria.MayExist)

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
}
