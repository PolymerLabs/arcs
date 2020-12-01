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
import arcs.core.data.CountType
import arcs.core.storage.ProxyMessage.ModelUpdate
import arcs.core.storage.ProxyMessage.Operations
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.volatiles.VolatileEntry
import arcs.core.storage.keys.RamDiskStorageKey
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
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests behaviors of the combination of [DirectStore] and [RamDisk]. */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class RamDiskStoreIntegrationTest {

  @Before
  fun setup() {
    DefaultDriverFactory.update(RamDiskDriverProvider())
    runBlocking {
      RamDisk.clear()
    }
  }

  @Test
  fun stores_sequenceOfModelAndOperationUpdates_asModels() = runBlockingTest {
    val storageKey = RamDiskStorageKey("unique")
    val activeStore = createStore(storageKey)

    val count = CrdtCount()
    count.applyOperation(MultiIncrement(actor = "me", version = 0 to 27, delta = 42))

    // Launch three separate coroutines to emulate some concurrency.
    val jobs = mutableListOf<Job>()
    jobs += launch {
      activeStore.onProxyMessage(ModelUpdate(count.data, id = 1))
      println("Sent 1")
    }
    jobs += launch {
      activeStore.onProxyMessage(
        Operations(listOf(Increment("me", version = 27 to 28)), id = 1)
      )
      println("Sent 2")
    }
    jobs += launch {
      activeStore.onProxyMessage(
        Operations(listOf(Increment("them", version = 0 to 1)), id = 1)
      )
      println("Sent 3")
    }
    println("Jobs length: ${jobs.size}")
    jobs.joinAll()
    println("Joined")

    activeStore.idle()

    val volatileEntry = RamDisk.memory.get<CrdtCount.Data>(storageKey)
    assertThat(volatileEntry?.data).isEqualTo(activeStore.getLocalData())
    assertThat(volatileEntry?.version).isEqualTo(3)
    println("Done")
  }

  @Test
  fun stores_operationUpdates_fromMultipleSources() = runBlockingTest {
    val storageKey = RamDiskStorageKey("unique")
    val activeStore1 = createStore(storageKey)
    val activeStore2 = createStore(storageKey)

    val count1 = CrdtCount()
    count1.applyOperation(MultiIncrement("me", version = 0 to 27, delta = 42))

    val count2 = CrdtCount()
    count2.applyOperation(MultiIncrement("them", version = 0 to 15, delta = 23))

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
              Increment("me", version = 27 to 28),
              Increment("other", version = 0 to 1)
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
              Increment("them", version = 15 to 16)
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
              MultiIncrement("me", version = 28 to 33, delta = 74)
            ),
            id = 1
          )
        )
      }
    }

    activeStore1.idle()
    activeStore2.idle()

    val volatileEntry: VolatileEntry<CrdtCount.Data>? = RamDisk.memory.get(storageKey)
    assertThat(volatileEntry?.data).isEqualTo(activeStore1.getLocalData())
    assertThat(volatileEntry?.data).isEqualTo(activeStore2.getLocalData())
    assertThat(volatileEntry?.version).isEqualTo(5)
  }

  @Test
  @Suppress("UNCHECKED_CAST")
  fun store_operationUpdates_fromMultipleSources_withTimingDelays() = runBlockingTest {
    val storageKey = RamDiskStorageKey("unique")
    val activeStore1 = createStore(storageKey)
    val activeStore2 = createStore(storageKey)

    activeStore1.onProxyMessage(Operations(listOf(Increment("me", 0 to 1)), 1))

    delay(100)

    val concurrentJobA = launch {
      delay(Random.nextLong(5))
      activeStore1.onProxyMessage(
        Operations(listOf(Increment("them", 0 to 1)), 1)
      )
    }
    val concurrentJobB = launch {
      delay(Random.nextLong(5))
      activeStore2.onProxyMessage(
        Operations(listOf(Increment("other", 0 to 1)), 1)
      )
    }

    listOf(concurrentJobA, concurrentJobB).joinAll()

    delay(100)

    activeStore2.onProxyMessage(Operations(listOf(Increment("other", 1 to 2)), 1))

    activeStore1.idle()
    activeStore2.idle()

    val entry: VolatileEntry<CrdtCount.Data>? = RamDisk.memory.get(storageKey)
    assertThat(entry?.data).isEqualTo(activeStore1.getLocalData())
    assertThat(entry?.data).isEqualTo(activeStore2.getLocalData())
    assertThat(entry?.version).isEqualTo(4)
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
