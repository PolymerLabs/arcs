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
import arcs.core.storage.driver.volatiles.VolatileEntry
import arcs.core.storage.driver.volatiles.VolatileMemoryImpl
import arcs.core.storage.keys.VolatileStorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [VolatileMemory]. */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class VolatileMemoryTest {
  private val bar = VolatileStorageKey(ArcId.newForTest("foo"), "bar")
  private val baz = bar.childKeyWithComponent("baz")

  @Test
  fun tokenChanges_withEachPutData() = runBlockingTest {
    val memory = VolatileMemoryImpl()
    val originalToken = memory.token

    memory.set(bar, VolatileEntry<Int>())

    val afterBar = memory.token
    assertThat(afterBar).isNotEqualTo(originalToken)

    memory.set(baz, VolatileEntry<Int>())
    assertThat(memory.token).isNotEqualTo(originalToken)
    assertThat(memory.token).isNotEqualTo(afterBar)
  }

  @Test
  fun get_returnsNullIfNoEntryForKey() = runBlockingTest {
    val memory = VolatileMemoryImpl()
    memory.set(bar, VolatileEntry<Int>())

    val value: VolatileEntry<Int>? = memory.get(baz)
    assertThat(value).isNull()
  }

  @Test
  fun get_returnsValueIfEntryExistsForKey() = runBlockingTest {
    val memory = VolatileMemoryImpl()
    val expectedValue = VolatileEntry(data = 42)
    memory.set(bar, expectedValue)

    val value: VolatileEntry<Int>? = memory.get(bar)
    assertThat(value).isEqualTo(expectedValue)
  }
}
