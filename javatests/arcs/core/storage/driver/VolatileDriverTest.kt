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

package arcs.core.storage.driver

import arcs.core.common.ArcId
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.type.Type
import arcs.core.type.Tag
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [VolatileDriver]. */
@Suppress("RedundantSuspendModifier")
@ExperimentalCoroutinesApi
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
        val driver = VolatileDriver<Int>(key, DummyType, memory)

        val expected = VolatileEntry(null, 0, driver)
        val actual: VolatileEntry<Int>? = memory[key]
        assertThat(expected).isEqualTo(actual)
    }

    @Test
    fun constructor_addsEntryToMemory_andAppendsItselfToEntryDrivers() {
        val driver1 = VolatileDriver<Int>(key, DummyType, memory)
        val driver2 = VolatileDriver<Int>(key, DummyType, memory)

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

        VolatileDriver<Int>(NotVolatileKey(), DummyType, memory)
    }

    @Test
    fun send_updatesMemory_whenVersion_isCorrect() = runBlockingTest {
        val driver = VolatileDriver<Int>(key, DummyType, memory)

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
    fun send_doesNotUpdateMemory_whenVersion_isIncorrect() = runBlockingTest {
        val driver = VolatileDriver<Int>(key, DummyType, memory)

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
    fun send_canSendToOtherDriverReceiver() = runBlockingTest {
        val driver1 = VolatileDriver<Int>(key, DummyType, memory)
        val driver2 = VolatileDriver<Int>(key, DummyType, memory)

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

    companion object {
        object DummyType: Type {
            override val tag = Tag.Count
            override fun toLiteral() = throw UnsupportedOperationException("")
        }
    }
}
