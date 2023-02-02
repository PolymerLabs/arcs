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

import arcs.core.crdt.CrdtCount
import arcs.core.crdt.CrdtCount.Operation.Increment
import arcs.core.crdt.CrdtCount.Operation.MultiIncrement
import arcs.core.crdt.VersionMap
import arcs.core.data.CountType
import arcs.core.storage.ProxyMessage.ModelUpdate
import arcs.core.storage.ProxyMessage.Operations
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.getTestHelper
import arcs.core.storage.testutil.testDriverFactory
import arcs.core.storage.testutil.testWriteBackProvider
import com.google.common.truth.Truth.assertThat
import kotlin.random.Random
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests behaviors of the combination of [DirectStore] and [RamDisk]. */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class DirectStoreConcurrencyTest {

  private val storageKey: StorageKey = RamDiskStorageKey("unique")

  @Before
  fun setup() = runBlockingTest {
    DefaultDriverFactory.update(RamDiskDriverProvider())
    RamDisk.clear()
  }

  @Test
  fun stores_sequenceOfModelAndOperationUpdates_asModels() = runBlockingTest {
    val activeStore = createStore(storageKey)

    val count = CrdtCount()
    count.applyOperation(MultiIncrement(actor = "me", VersionMap("me" to 1), delta = 42))

    // Launch three separate coroutines to emulate some concurrency.
    val jobs = mutableListOf<Job>()
    jobs += launch {
      activeStore.onProxyMessage(ModelUpdate(count.data, id = 1))
      println("Sent 1")
    }
    jobs += launch {
      activeStore.onProxyMessage(
        Operations(listOf(Increment("me", VersionMap("me" to 2))), id = 1)
      )
      println("Sent 2")
    }
    jobs += launch {
      activeStore.onProxyMessage(
        Operations(listOf(Increment("them", VersionMap("them" to 1))), id = 1)
      )
      println("Sent 3")
    }
    println("Jobs length: ${jobs.size}")
    jobs.joinAll()
    println("Joined")

    activeStore.idle()

    val driverTestHelper = activeStore.driver.getTestHelper()
    assertThat(driverTestHelper.getData()).isEqualTo(activeStore.getLocalData())
    assertThat(driverTestHelper.getVersion()).isEqualTo(3)
    println("Done")
  }

  @Test
  fun stores_operationUpdates_fromMultipleSources() = runBlockingTest {
    val activeStore1 = createStore(storageKey)
    val activeStore2 = createStore(storageKey)

    val count1 = CrdtCount()
    count1.applyOperation(MultiIncrement("me", VersionMap("me" to 1), delta = 42))

    val count2 = CrdtCount()
    count2.applyOperation(MultiIncrement("them", VersionMap("them" to 1), delta = 23))

    // These three opearations cannot occur concurrently (if they did, versions wouldn't line up
    // correctly on an actor-by-actor basis, and thus - CRDT would be unable to apply changes.
    coroutineScope {
      async { activeStore1.onProxyMessage(ModelUpdate(count1.data, 1)) }
      async { activeStore2.onProxyMessage(ModelUpdate(count2.data, 1)) }
      async {
        delay(Random.nextLong(1500))
        activeStore1.onProxyMessage(
          Operations(
            listOf(
              Increment("me", VersionMap("me" to 2)),
              Increment("other", VersionMap("other" to 1))
            ),
            id = 1
          )
        )
      }
    }

    // These two operations can occur concurrently, since their modifications come from only one
    // actor at a time, and their actors' versions are correct.
    coroutineScope {
      async(start = CoroutineStart.UNDISPATCHED) {
        // Random sleep/delay, to make the ordering of execution random.
        delay(Random.nextLong(1500))
        activeStore2.onProxyMessage(
          Operations(
            listOf(
              Increment("them", VersionMap("them" to 2))
            ),
            id = 1
          )
        )
      }
      async(start = CoroutineStart.UNDISPATCHED) {
        // Random sleep/delay, to make the ordering of execution random.
        delay(Random.nextLong(1500))
        activeStore1.onProxyMessage(
          Operations(
            listOf(
              MultiIncrement("me", VersionMap("me" to 3), delta = 74)
            ),
            id = 1
          )
        )
      }
    }

    activeStore1.idle()
    activeStore2.idle()

    val driverTestHelper = activeStore1.driver.getTestHelper()
    assertThat(driverTestHelper.getData()).isEqualTo(activeStore1.getLocalData())
    assertThat(driverTestHelper.getData()).isEqualTo(activeStore2.getLocalData())
    assertThat(driverTestHelper.getVersion()).isEqualTo(5)
  }

  @Test
  @Suppress("UNCHECKED_CAST")
  fun store_operationUpdates_fromMultipleSources_withTimingDelays() = runBlockingTest {
    val activeStore1 = createStore(storageKey)
    val activeStore2 = createStore(storageKey)

    activeStore1.onProxyMessage(Operations(listOf(Increment("me", VersionMap("me" to 1))), 1))

    delay(100)

    val concurrentJobA = launch {
      delay(Random.nextLong(5))
      activeStore1.onProxyMessage(
        Operations(listOf(Increment("them", VersionMap("them" to 1))), 1)
      )
    }
    val concurrentJobB = launch {
      delay(Random.nextLong(5))
      activeStore2.onProxyMessage(
        Operations(listOf(Increment("other", VersionMap("other" to 1))), 1)
      )
    }

    listOf(concurrentJobA, concurrentJobB).joinAll()

    delay(100)

    activeStore2.onProxyMessage(Operations(listOf(Increment("other", VersionMap("other" to 2))), 1))

    activeStore1.idle()
    activeStore2.idle()

    val driverTestHelper = activeStore1.driver.getTestHelper()
    assertThat(driverTestHelper.getData()).isEqualTo(activeStore1.getLocalData())
    assertThat(driverTestHelper.getData()).isEqualTo(activeStore2.getLocalData())
    assertThat(driverTestHelper.getVersion()).isEqualTo(4)
    assertThat(activeStore1.localModel.consumerView).isEqualTo(4)
    assertThat(activeStore2.localModel.consumerView).isEqualTo(4)
  }

  companion object {
    private suspend fun CoroutineScope.createStore(
      storageKey: StorageKey
    ): DirectStore<CrdtCount.Data, CrdtCount.Operation, Int> {
      return DirectStore.create(
        StoreOptions(
          storageKey,
          type = CountType()
        ),
        this,
        testDriverFactory,
        ::testWriteBackProvider,
        null
      )
    }
  }
}
