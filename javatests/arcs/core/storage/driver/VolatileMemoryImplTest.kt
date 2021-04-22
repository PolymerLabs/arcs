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
import arcs.core.storage.driver.volatiles.VolatileEntry
import arcs.core.storage.driver.volatiles.VolatileMemory
import arcs.core.storage.driver.volatiles.VolatileMemoryImpl
import arcs.core.storage.keys.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [VolatileMemoryImpl]. */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class VolatileMemoryImplTest {
  private val bar = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
  private val baz = bar.newKeyWithComponent("baz")
  private val expectedValue = VolatileEntry(data = 42)
  private lateinit var memory: VolatileMemory

  @Before
  fun setup() {
    memory = VolatileMemoryImpl()
  }

  @Test
  fun tokenChanges_withEachPutData() = runBlockingTest {
    val originalToken = memory.token

    memory.set(bar, VolatileEntry<Int>())

    val afterBar = memory.token
    assertThat(afterBar).isNotEqualTo(originalToken)

    memory.set(baz, VolatileEntry<Int>())
    assertThat(memory.token).isNotEqualTo(originalToken)
    assertThat(memory.token).isNotEqualTo(afterBar)
  }

  @Test
  fun tokenChanges_withEachUpdateData() = runBlockingTest {
    val originalToken = memory.token
    memory.update<Int>(bar) { value: VolatileEntry<Int>? ->
      VolatileEntry<Int>(data = (value?.data ?: 1) * 2)
    }

    val afterBar = memory.token
    assertThat(afterBar).isNotEqualTo(originalToken)

    memory.update<Int>(bar) { value: VolatileEntry<Int>? ->
      VolatileEntry<Int>(data = (value?.data ?: 1) * 2)
    }

    assertThat(memory.token).isNotEqualTo(originalToken)
    assertThat(memory.token).isNotEqualTo(afterBar)
  }

  @Test
  fun set_returnsPreviousValue() = runBlockingTest {
    val originalValue = VolatileEntry(data = 123)
    assertThat(memory.set(bar, originalValue)).isNull()
    assertThat(memory.set(bar, expectedValue)).isEqualTo(originalValue)
    assertThat(memory.get<Int>(bar)).isEqualTo(expectedValue)
  }

  @Test
  fun get_returnsNullIfNoEntryForKey() = runBlockingTest {
    memory.set(bar, VolatileEntry<Int>())

    assertThat(memory.get<Int>(baz)).isNull()
  }

  @Test
  fun get_returnsValueIfEntryExistsForKey() = runBlockingTest {
    memory.set(bar, expectedValue)

    assertThat(memory.get<Int>(bar)).isEqualTo(expectedValue)
  }

  @Test
  fun update_returnsValueWithIdFunction() = runBlockingTest {
    memory.set(bar, expectedValue)

    assertThat(memory.update<Int>(bar) { value -> value!! }).isEqualTo(false to expectedValue)
    assertThat(memory.get<Int>(bar)).isEqualTo(expectedValue)
  }

  @Test
  fun update_returnsValueWithIdOrDefaultFunction() = runBlockingTest {
    assertThat(memory.update<Int>(bar) { expectedValue }).isEqualTo(true to expectedValue)
    assertThat(memory.get<Int>(bar)).isEqualTo(expectedValue)
  }

  @Test
  fun update_returnsUpdatedValueWithDataPlusOneFunction() = runBlockingTest {
    val initialValue = VolatileEntry(data = 41)
    memory.set(bar, initialValue)
    assertThat(
      memory.update<Int>(bar) { value: VolatileEntry<Int>? ->
        VolatileEntry(data = (value?.data ?: 0) + 1)
      }
    ).isEqualTo(true to expectedValue)
    assertThat(memory.get<Int>(bar)).isEqualTo(expectedValue)
  }

  @Test
  fun clear_removesSetValues() = runBlockingTest {
    memory.set(bar, expectedValue)
    assertThat(memory.get<Int>(bar)).isEqualTo(expectedValue)
    memory.clear()
    assertThat(memory.get<Int>(bar)).isNull()
  }

  @Test
  fun clear_succeedsWithoutValues() = runBlockingTest {
    assertThat(memory.get<Int>(bar)).isNull()
    memory.clear()
    assertThat(memory.get<Int>(bar)).isNull()
  }

  @Test
  fun clear_leavesMemoryInGoodState() = runBlockingTest {
    memory.set(bar, expectedValue)
    assertThat(memory.get<Int>(bar)).isEqualTo(expectedValue)

    memory.clear()
    assertThat(memory.get<Int>(bar)).isNull()

    memory.set(bar, expectedValue)
    assertThat(memory.get<Int>(bar)).isEqualTo(expectedValue)
  }

  @Test
  fun contains_returnsFalseIfNoEntryForKey() = runBlockingTest {
    memory.set(bar, VolatileEntry<Int>())

    assertThat(memory.contains(baz)).isFalse()
  }

  @Test
  fun contains_returnsTrueOnlyIfEntryExistsForKey() = runBlockingTest {
    assertThat(memory.contains(bar)).isFalse()

    memory.set(bar, expectedValue)

    assertThat(memory.contains(bar)).isTrue()
  }

  @Test
  fun addListenerAndSet_callsListeners() = runBlockingTest {
    var listenerWasCalledWithValue: Pair<StorageKey, Int?>? = null
    memory.addListener { key: StorageKey, value: Any? ->
      listenerWasCalledWithValue = key to (value as? Int?)
    }
    memory.set(bar, expectedValue)

    assertThat(listenerWasCalledWithValue).isEqualTo(bar to expectedValue.data)
  }

  @Test
  fun addListenerAndUpdate_callsListeners() = runBlockingTest {
    var listenerWasCalledWithValue: Pair<StorageKey, Int?>? = null
    memory.addListener { key: StorageKey, value: Any? ->
      listenerWasCalledWithValue = key to (value as? Int?)
    }
    memory.update<Int>(bar) {
      expectedValue
    }

    assertThat(listenerWasCalledWithValue).isEqualTo(bar to expectedValue.data)
  }

  @Test
  fun removeListenerAndUpdate_doesNotCallRemovedListener() = runBlockingTest {
    var listenerWasCalledWithValue: Pair<StorageKey, Int?>? = null
    val listener = { key: StorageKey, value: Any? ->
      listenerWasCalledWithValue = key to (value as? Int?)
    }
    memory.addListener(listener)
    memory.update<Int>(bar) {
      expectedValue
    }

    assertThat(listenerWasCalledWithValue).isEqualTo(bar to expectedValue.data)
    memory.removeListener(listener)

    memory.update<Int>(bar) {
      // Ensure that this is non-equal to the previous expected value
      VolatileEntry(data = (expectedValue.data ?: 0) + 1)
    }

    assertThat(listenerWasCalledWithValue).isEqualTo(bar to expectedValue.data)
  }

  @Test
  fun addListenerAndUpdate_doesNotCallListenerWhenUpdateIsNoOp() = runBlockingTest {
    var listenerWasCalledWithValue: Pair<StorageKey, Int?>? = null
    val listener = { key: StorageKey, value: Any? ->
      listenerWasCalledWithValue = key to (value as? Int?)
    }
    memory.set(bar, expectedValue)
    memory.addListener(listener)

    memory.update<Int>(bar) {
      expectedValue // NoOp
    }

    assertThat(listenerWasCalledWithValue).isNull()
  }

  @Test
  fun addListenerAndSet_doesNotCallListenerWhenSetIsNoOp() = runBlockingTest {
    var listenerWasCalledWithValue: Pair<StorageKey, Int?>? = null
    val listener = { key: StorageKey, value: Any? ->
      listenerWasCalledWithValue = key to (value as? Int?)
    }
    memory.set(bar, expectedValue)
    memory.addListener(listener)

    memory.set(bar, expectedValue) // NoOp

    assertThat(listenerWasCalledWithValue).isNull()
  }
}
