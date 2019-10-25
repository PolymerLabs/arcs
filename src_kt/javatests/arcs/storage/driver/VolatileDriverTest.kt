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
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [VolatileDriver]. */
@RunWith(JUnit4::class)
class VolatileDriverTest {
  private lateinit var key: VolatileStorageKey
  private lateinit var arcId: ArcId
  private lateinit var memory: VolatileMemory

  @Before
  fun setup() {
    arcId = ArcId.newForTest("test")
    memory = VolatileMemory()
    key = VolatileStorageKey(arcId, "foo")
  }

  @Test
  fun constructor_addsEntryToMemory() {
    val driver = VolatileDriver<Int>(key, ExistenceCriteria.ShouldCreate, memory)

    val expected = VolatileEntry(null, 0, driver)
    val actual: VolatileEntry<Int>? = memory[key]
    assertThat(expected).isEqualTo(actual)
  }

  @Test
  fun constructor_addsEntryToMemory_andAppendsItselfToEntryDrivers() {
    val driver1 = VolatileDriver<Int>(key, ExistenceCriteria.ShouldCreate, memory)
    val driver2 = VolatileDriver<Int>(key, ExistenceCriteria.MayExist, memory)

    val expected = VolatileEntry(null, 0, driver1, driver2)
    val actual: VolatileEntry<Int>? = memory[key]
    assertThat(expected).isEqualTo(actual)
  }

  @Test(expected = IllegalArgumentException::class)
  fun constructorThrows_whenStorageKey_isNotVolatileStorageKey() {
    class NotVolatileKey : StorageKey("notRight") {
      override fun toKeyString(): String = "M'eh"
      override fun childKeyWithComponent(component: String): StorageKey = NotVolatileKey()
    }

    VolatileDriver<Int>(NotVolatileKey(), ExistenceCriteria.ShouldExist, memory)
  }

  @Test(expected = IllegalArgumentException::class)
  fun constructorThrows_whenShouldCreate_butAlreadyCreated() {
    memory[key] = VolatileEntry(42)

    VolatileDriver<Int>(key, ExistenceCriteria.ShouldCreate, memory)
  }

  @Test(expected = IllegalArgumentException::class)
  fun constructorThrows_whenShouldExist_butDoesntExist() {
    VolatileDriver<Int>(key, ExistenceCriteria.ShouldExist, memory)
  }

  @Test
  fun firstRegisterReceiver_whenShouldExist_receivesExistingValue() {
    memory[key] = VolatileEntry(42, version = 1337)

    val driver = VolatileDriver<Int>(key, ExistenceCriteria.ShouldExist, memory)

    var calledWithData: Int? = null
    var calledWithVersion: Int? = null
    fun receiver(data: Int, version: Int) {
      calledWithData = data
      calledWithVersion = version
    }

    driver.registerReceiver(receiver = ::receiver)

    assertThat(calledWithData).isEqualTo(42)
    assertThat(calledWithVersion).isEqualTo(1337)
  }

  @Test
  fun firstRegisterReceiver_whenShouldExist_doesNotReceiveExistingValue_whenTokenMatches() {
    memory[key] = VolatileEntry(42, version = 1337)

    val driver = VolatileDriver<Int>(key, ExistenceCriteria.ShouldExist, memory)

    @Suppress("UNUSED_PARAMETER")
    fun receiver(data: Int, version: Int) {
      fail("Should not be called.")
    }

    driver.registerReceiver(token = driver.token, receiver = ::receiver)
  }

  @Test
  fun firstRegisterReceiver_whenMayExist_receivesExistingValue() {
    memory[key] = VolatileEntry(42, version = 1337)

    val driver = VolatileDriver<Int>(key, ExistenceCriteria.MayExist, memory)

    var calledWithData: Int? = null
    var calledWithVersion: Int? = null
    fun receiver(data: Int, version: Int) {
      calledWithData = data
      calledWithVersion = version
    }

    driver.registerReceiver(receiver = ::receiver)

    assertThat(calledWithData).isEqualTo(42)
    assertThat(calledWithVersion).isEqualTo(1337)
  }

  @Test
  fun firstRegisterReceiver_whenMayExist_doesNotReceiveValue_whenDoesntExist() {
    val driver = VolatileDriver<Int>(key, ExistenceCriteria.MayExist, memory)

    @Suppress("UNUSED_PARAMETER")
    fun receiver(data: Int, version: Int) {
      fail("Should not be called.")
    }

    driver.registerReceiver(receiver = ::receiver)
  }

  @Test
  fun send_updatesMemory_whenVersion_isCorrect() = runBlocking {
    val driver = VolatileDriver<Int>(key, ExistenceCriteria.ShouldCreate, memory)

    assertThat(driver.send(data = 1, version = 1)).isTrue()

    var expected = VolatileEntry(1, 1, driver)
    var actual: VolatileEntry<Int>? = memory[key]
    assertThat(expected).isEqualTo(actual)

    assertThat(driver.send(data = 2, version = 2)).isTrue()

    expected = VolatileEntry(2, 2, driver)
    actual = memory[key]
    assertThat(expected).isEqualTo(actual)
  }

  @Test
  fun send_doesNotUpdateMemory_whenVersion_isIncorrect() = runBlocking {
    val driver = VolatileDriver<Int>(key, ExistenceCriteria.ShouldCreate, memory)

    assertThat(driver.send(data = 1, version = 0)).isFalse()

    var expected = VolatileEntry(null, 0, driver)
    var actual: VolatileEntry<Int>? = memory[key]
    assertThat(expected).isEqualTo(actual)

    assertThat(driver.send(data = 1, version = 2)).isFalse()

    expected = VolatileEntry(null, 0, driver)
    actual = memory[key]
    assertThat(expected).isEqualTo(actual)
  }

  @Test
  fun send_canSendToOtherDriverReceiver() = runBlocking {
    val driver1 = VolatileDriver<Int>(key, ExistenceCriteria.ShouldCreate, memory)
    val driver2 = VolatileDriver<Int>(key, ExistenceCriteria.ShouldExist, memory)

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
}
