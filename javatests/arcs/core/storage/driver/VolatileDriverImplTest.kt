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
import arcs.core.storage.DriverReceiver
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.volatiles.VolatileDriver
import arcs.core.storage.driver.volatiles.VolatileDriverImpl
import arcs.core.storage.driver.volatiles.VolatileEntry
import arcs.core.storage.driver.volatiles.VolatileMemory
import arcs.core.storage.driver.volatiles.VolatileMemoryImpl
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [VolatileDriverImpl]. */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class VolatileDriverImplTest {
  private lateinit var key: VolatileStorageKey
  private lateinit var arcId: ArcId
  private lateinit var memory: VolatileMemory

  @Before
  fun setup() {
    arcId = ArcId.newForTest("test")
    memory = VolatileMemoryImpl()
    key = VolatileStorageKey(arcId, "foo")
  }

  @Test
  fun constructor_volatileStorageKey_success() = runBlockingTest {
    val driver = VolatileDriverImpl.create<Int>(key, Int::class, memory)

    assertThat(driver.storageKey).isEqualTo(key)
  }

  @Test
  fun constructor_ramdiskStorageKey_success() = runBlockingTest {
    val ramdiskKey = RamDiskStorageKey("bar")
    val driver = VolatileDriverImpl.create<Int>(ramdiskKey, Int::class, memory)

    assertThat(driver.storageKey).isEqualTo(ramdiskKey)
  }

  @Test
  fun constructor_addsEntryToMemory() = runBlockingTest {
    val driver = VolatileDriverImpl.create<Int>(key, Int::class, memory)

    val expected = VolatileEntry(null, 0, driver)
    val actual: VolatileEntry<Int>? = memory.get(key)
    assertThat(expected).isEqualTo(actual)
  }

  @Test
  fun constructor_addsEntryToMemory_andAppendsItselfToEntryDrivers() = runBlockingTest {
    val driver1 = VolatileDriverImpl.create<Int>(key, Int::class, memory)
    val driver2 = VolatileDriverImpl.create<Int>(key, Int::class, memory)

    val expected = VolatileEntry(null, 0, driver1, driver2)
    val actual: VolatileEntry<Int>? = memory.get(key)
    assertThat(expected).isEqualTo(actual)
  }

  @Test(expected = IllegalArgumentException::class)
  fun constructor_notVolatileOrRamdiskStorageKey_throws() = runBlockingTest {
    class NotVolatileKey : StorageKey("notRight") {
      override fun toKeyString(): String = "M'eh"
      override fun childKeyWithComponent(component: String): StorageKey = NotVolatileKey()
    }
    VolatileDriverImpl.create<Int>(NotVolatileKey(), Int::class, memory)
  }

  @Test
  fun send_correctVersion_updatesMemory() = runBlockingTest {
    val driver = VolatileDriverImpl.create<Int>(key, Int::class, memory)

    assertThat(driver.send(data = 1, version = 1)).isTrue()

    var expected = VolatileEntry(1, 1, driver)
    var actual: VolatileEntry<Int>? = memory.get(key)
    assertThat(expected).isEqualTo(actual)

    assertThat(driver.send(data = 2, version = 2)).isTrue()

    expected = VolatileEntry(2, 2, driver)
    actual = memory.get(key)
    assertThat(expected).isEqualTo(actual)
  }

  @Test
  fun send_incorrectVersion_doesNotUpdateMemory() = runBlockingTest {
    val driver = VolatileDriverImpl.create<Int>(key, Int::class, memory)

    assertThat(driver.send(data = 1, version = 0)).isFalse()

    var expected = VolatileEntry(null, 0, driver)
    var actual: VolatileEntry<Int>? = memory.get(key)
    assertThat(expected).isEqualTo(actual)

    assertThat(driver.send(data = 1, version = 2)).isFalse()

    expected = VolatileEntry(null, 0, driver)
    actual = memory.get(key)
    assertThat(expected).isEqualTo(actual)
  }

  @Test
  fun registerReciever_setsReciever() = runBlockingTest {
    val driver = VolatileDriverImpl.create<Int>(key, Int::class, memory)
    val receiver: DriverReceiver<Int> = { _, _ -> }

    driver.registerReceiver(driver.token, receiver)
    assertThat(driver.receiver).isEqualTo(receiver)
  }

  @Test
  fun send_sameDriverReceiver_doesNotSendUpdate() = runBlockingTest {
    val driver = VolatileDriverImpl.create<Int>(key, Int::class, memory)
    var receivedDataAt: Int? = null
    var receivedVersionAt: Int? = null
    driver.registerReceiver(driver.token) { data, version ->
      receivedDataAt = data
      receivedVersionAt = version
    }

    assertThat(driver.send(1, 1)).isTrue()

    assertThat(receivedDataAt).isNull()
    assertThat(receivedVersionAt).isNull()
  }

  @Test
  fun send_otherDriverReceiverWithNullToken_sendsUpdate() = runBlockingTest {
    val driver1 = VolatileDriverImpl.create<Int>(key, Int::class, memory)
    val driver2 = VolatileDriverImpl.create<Int>(key, Int::class, memory)

    var receivedDataAt: Int? = null
    var receivedVersionAt: Int? = null
    driver2.registerReceiver(null) { data, version ->
      receivedDataAt = data
      receivedVersionAt = version
    }

    assertThat(driver1.send(1, 1)).isTrue()
    assertThat(receivedDataAt).isEqualTo(1)
    assertThat(receivedVersionAt).isEqualTo(1)
  }

  @Test
  fun send_otherDriverReceiver_sendsUpdate() = runBlockingTest {
    val driver1 = VolatileDriverImpl.create<Int>(key, Int::class, memory)
    val driver2 = VolatileDriverImpl.create<Int>(key, Int::class, memory)

    var receivedDataAt1: Int? = null
    var receivedVersionAt1: Int? = null
    driver1.registerReceiver(driver1.token) { data, version ->
      receivedDataAt1 = data
      receivedVersionAt1 = version
    }

    var receivedDataAt2: Int? = null
    var receivedVersionAt2: Int? = null
    driver2.registerReceiver(driver2.token) { data, version ->
      receivedDataAt2 = data
      receivedVersionAt2 = version
    }

    assertThat(driver1.send(1, 1)).isTrue()
    assertThat(receivedDataAt1).isNull()
    assertThat(receivedVersionAt1).isNull()
    assertThat(receivedDataAt2).isEqualTo(1)
    assertThat(receivedVersionAt2).isEqualTo(1)

    assertThat(driver2.send(2, 2)).isTrue()
    assertThat(receivedDataAt2).isEqualTo(1)
    assertThat(receivedVersionAt2).isEqualTo(1)
    assertThat(receivedDataAt1).isEqualTo(2)
    assertThat(receivedVersionAt1).isEqualTo(2)
  }

  @Test
  fun close_onCloseCallbackCalled() = runBlockingTest {
    var onCloseCalledWithDriver: VolatileDriver<Int>? = null
    val onClose: suspend (VolatileDriver<Int>) -> Unit = { driver ->
      onCloseCalledWithDriver = driver
    }
    val driver = VolatileDriverImpl.create<Int>(key, Int::class, memory, onClose)

    driver.close()

    assertThat(onCloseCalledWithDriver).isEqualTo(driver)
  }

  @Test
  fun toString_containsKeyAndIdentifier() = runBlockingTest {
    val driver1 = VolatileDriverImpl.create<Int>(key, Int::class, memory)
    val driver2 = VolatileDriverImpl.create<Int>(key, Int::class, memory)

    assertThat(driver1.toString()).contains(key.toString())
    assertThat(driver2.toString()).contains(key.toString())
    assertThat(driver1.toString()).isNotEqualTo(driver2.toString())
  }
}
