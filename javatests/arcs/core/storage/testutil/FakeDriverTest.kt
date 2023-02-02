/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage.testutil

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class FakeDriverTest {

  @Test
  fun receiverGets_waitingData() = runBlockingTest {
    val driver = FakeDriver<Int>(DummyStorageKey("key"))
    driver.send(42, 1)
    var receiverWasCalled = false
    driver.registerReceiver("") { data, version ->
      assertThat(data).isEqualTo(42)
      assertThat(version).isEqualTo(1)
      receiverWasCalled = true
    }
    assertThat(receiverWasCalled).isTrue()
  }

  @Test
  fun receiverGets_newData() = runBlockingTest {
    val driver = FakeDriver<Int>(DummyStorageKey("key"))
    var receiverWasCalled = false
    driver.registerReceiver("") { data, version ->
      assertThat(data).isEqualTo(42)
      assertThat(version).isEqualTo(1)
      receiverWasCalled = true
    }
    driver.send(42, 1)
    assertThat(receiverWasCalled).isTrue()
  }
}
