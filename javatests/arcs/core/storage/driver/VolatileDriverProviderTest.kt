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
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [VolatileDriverProvider]. */
@RunWith(JUnit4::class)
class VolatileDriverProviderTest {
  @get:Rule
  val logRule = LogRule()

  private val providerFactory = VolatileDriverProvider()

  @Test
  fun willSupport_requiresVolatileStorageKey() {
    class NonVolatileKey : StorageKey("nonvolatile") {
      override fun toKeyString() = "blah"
      override fun childKeyWithComponent(component: String) = NonVolatileKey()
    }

    assertThat(providerFactory.willSupport(NonVolatileKey())).isFalse()
  }

  @Test
  fun getDriver_getsDriverForStorageKey() = runBlocking {
    val driver = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)

    assertThat(driver).isNotNull()
    assertThat(driver.storageKey).isEqualTo(DUMMY_STORAGE_KEY_1)
  }

  @Test
  fun getDriver_forDifferentStorageKey_providesDifferentInstance() = runBlocking {
    val driver1 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)
    val driver2 = providerFactory.getDriver(DUMMY_STORAGE_KEY_2, Int::class)

    assertThat(driver1).isNotSameInstanceAs(driver2)
  }

  @Test
  fun getDriver_forSameStorageKey_providesDifferentInstance() = runBlocking {
    val driver1 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)
    val driver2 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)

    assertThat(driver1).isNotSameInstanceAs(driver2)
  }

  @Test
  fun getDriver_forSameStorageKey_afterClosingFirst_providesDifferentInstance() = runBlocking {
    val driver1 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)
    driver1.close()
    val driver2 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)

    assertThat(driver1).isNotSameInstanceAs(driver2)
  }

  @Test
  fun getDriver_forDifferentStorageKey_usesDifferentVolatileMemory() = runBlocking {
    val driver1 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)
    // Initialize some data in the memory via first driver
    driver1.send(DUMMY_DATA, 1)

    val driver2 = providerFactory.getDriver(DUMMY_STORAGE_KEY_2, Int::class)
    // This should fail, driver2 is a different memory, not affected by driver1.send
    val version2Success = driver2.send(data = DUMMY_DATA + 1, version = 2)
    // This should succeed, driver1 is still waiting for its first version
    val version1Success = driver2.send(data = DUMMY_DATA + 1, version = 1)

    assertThat(version1Success).isTrue()
    assertThat(version2Success).isFalse()
  }

  @Test
  fun getDriver_forSameStorageKey_usesSameVolatileMemory() = runBlocking {
    val driver1 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)
    // Initialize some data in the memory via first driver
    driver1.send(DUMMY_DATA, 1)

    val driver2 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)
    // This should fail, as the driver is already at version 1
    val version1Success = driver2.send(data = DUMMY_DATA + 1, version = 1)
    // This should succeed, the driver is at version 1 from the driver1.send
    val version2Success = driver2.send(data = DUMMY_DATA + 1, version = 2)

    assertThat(version1Success).isFalse()
    assertThat(version2Success).isTrue()
  }

  @Test
  fun getDriver_forSameStorageKey_afterFirstOneClosed_usesDifferentVolatileMemory() = runBlocking {
    val driver1 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)
    // Initialize some data in the memory via first driver
    driver1.send(DUMMY_DATA, 1)
    driver1.close()

    val driver2 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)
    // This should fail, driver2 is for the same storage key, but since driver1 was closed, no
    // more drivers were using the volatile memory; it should have  been released.
    val version2Success = driver2.send(data = DUMMY_DATA + 1, version = 2)
    // This should succeed, driver1 is still waiting for its first version
    val version1Success = driver2.send(data = DUMMY_DATA + 1, version = 1)

    assertThat(version1Success).isTrue()
    assertThat(version2Success).isFalse()
  }

  @Test
  fun getEntitiesCount_inMemory_returnsTotal() = runBlocking {
    val driver1 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)
    val driver2 = providerFactory.getDriver(DUMMY_STORAGE_KEY_2, Int::class)
    // Initialize some data in the memory via first driver
    driver1.send(DUMMY_DATA, 1)
    // Initialize some data in the memory via second driver
    driver2.send(DUMMY_DATA, 1)

    assertThat(providerFactory.getEntitiesCount(inMemory = true)).isEqualTo(2L)
  }

  @Test
  fun getEntitiesCount_notInMemory_returnsZero() = runBlocking {
    val driver1 = providerFactory.getDriver(DUMMY_STORAGE_KEY_1, Int::class)
    val driver2 = providerFactory.getDriver(DUMMY_STORAGE_KEY_2, Int::class)
    // Initialize some data in the memory via first driver
    driver1.send(DUMMY_DATA, 1)
    // Initialize some data in the memory via second driver
    driver2.send(DUMMY_DATA, 1)

    assertThat(providerFactory.getEntitiesCount(inMemory = false)).isEqualTo(0L)
  }

  @Test
  fun getEntitiesCount_inMemory_startsFromZero() = runBlocking {
    assertThat(providerFactory.getEntitiesCount(inMemory = true)).isEqualTo(0L)
  }

  companion object {
    const val DUMMY_DATA = 42

    private val DUMMY_ARCID_1 = ArcId.newForTest("foo")
    private val DUMMY_ARCID_2 = ArcId.newForTest("bar")

    private val DUMMY_STORAGE_KEY_1 = VolatileStorageKey(DUMMY_ARCID_1, "myfoo")
    private val DUMMY_STORAGE_KEY_2 = VolatileStorageKey(DUMMY_ARCID_2, "mybar")
  }
}
