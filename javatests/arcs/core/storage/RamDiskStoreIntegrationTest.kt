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

package arcs.core.storage

import arcs.core.crdt.CrdtCount
import arcs.core.crdt.CrdtCount.Operation.Increment
import arcs.core.crdt.CrdtCount.Operation.MultiIncrement
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.data.CountType
import arcs.core.storage.ProxyMessage.ModelUpdate
import arcs.core.storage.ProxyMessage.Operations
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.VolatileEntry
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.random.Random
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests behaviors of the combination of [DirectStore] and [RamDisk]. */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class RamDiskStoreIntegrationTest {
    private lateinit var ramDiskProvider: DriverProvider

    @Before
    fun setup() {
        ramDiskProvider = RamDiskDriverProvider()
    }

    @After
    fun teardown() {
        DriverFactory.clearRegistrations()
        CapabilitiesResolver.reset()
        RamDisk.clear()
    }

    @Test
    fun stores_sequenceOfModelAndOperationUpdates_asModels() = runBlockingTest {
        val storageKey = RamDiskStorageKey("unique")
        val store = createStore(storageKey)
        val activeStore = store.activate()

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
        val store1 = createStore(storageKey)
        val activeStore1 = store1.activate()
        val store2 = createStore(storageKey)
        val activeStore2 = store2.activate()

        val count1 = CrdtCount()
        count1.applyOperation(MultiIncrement("me", version = 0 to 27, delta = 42))

        val count2 = CrdtCount()
        count2.applyOperation(MultiIncrement("them", version = 0 to 15, delta = 23))

        // These three opearations cannot occur concurrently (if they did, versions wouldn't line up
        // correctly on an actor-by-actor basis, and thus - CRDT would be unable to apply changes.
        val modelReply1 = async { activeStore1.onProxyMessage(ModelUpdate(count1.data, 1)) }
        val modelReply2 = async { activeStore2.onProxyMessage(ModelUpdate(count2.data, 1)) }
        val opReply1 =
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

        // They should all return true.
        assertThat(listOf(modelReply1.await(), modelReply2.await(), opReply1.await()))
            .containsExactly(true, true, true)

        // These two operations can occur concurrently, since their modifications come from only one
        // actor at a time, and their actors' versions are correct.
        val opReply2 =
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
        val opReply3 =
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

        assertThat(listOf(opReply2.await(), opReply3.await())).containsExactly(true, true)

        activeStore1.idle()
        activeStore2.idle()

        val volatileEntry: VolatileEntry<CrdtCount.Data>? = RamDisk.memory[storageKey]
        assertThat(volatileEntry?.data).isEqualTo(activeStore1.getLocalData())
        assertThat(volatileEntry?.data).isEqualTo(activeStore2.getLocalData())
        assertThat(volatileEntry?.version).isEqualTo(5)
    }

    @Test
    @Suppress("UNCHECKED_CAST")
    fun store_operationUpdates_fromMultipleSources_withTimingDelays() = runBlockingTest {
        val storageKey = RamDiskStorageKey("unique")
        val store1 = createStore(storageKey)
        val activeStore1 = store1.activate() as DirectStore<CrdtData, CrdtOperation, Any>
        val store2 = createStore(storageKey)
        val activeStore2 = store2.activate() as DirectStore<CrdtData, CrdtOperation, Any>

        assertThat(
            activeStore1.onProxyMessage(Operations(listOf(Increment("me", 0 to 1)), 1))
        ).isTrue()

        delay(100)

        val concurrentJobA = launch {
            delay(Random.nextLong(5))
            assertThat(
                activeStore1.onProxyMessage(
                    Operations(listOf(Increment("them", 0 to 1)), 1)
                )
            ).isTrue()
        }
        val concurrentJobB = launch {
            delay(Random.nextLong(5))
            assertThat(
                activeStore2.onProxyMessage(
                    Operations(listOf(Increment("other", 0 to 1)), 1)
                )
            ).isTrue()
        }

        listOf(concurrentJobA, concurrentJobB).joinAll()

        delay(100)

        assertThat(
            activeStore2.onProxyMessage(Operations(listOf(Increment("other", 1 to 2)), 1))
        ).isTrue()

        activeStore1.idle()
        activeStore2.idle()

        val entry: VolatileEntry<CrdtCount.Data>? = RamDisk.memory[storageKey]
        assertThat(entry?.data).isEqualTo(activeStore1.getLocalData())
        assertThat(entry?.data).isEqualTo(activeStore2.getLocalData())
        assertThat(entry?.version).isEqualTo(4)
        assertThat(activeStore1.localModel.consumerView).isEqualTo(4)
        assertThat(activeStore2.localModel.consumerView).isEqualTo(4)
    }

    companion object {
        private fun createStore(
            storageKey: StorageKey
        ): Store<CrdtCount.Data, CrdtCount.Operation, Int> {
            return Store(
                StoreOptions(
                    storageKey,
                    type = CountType()
                )
            )
        }
    }
}
