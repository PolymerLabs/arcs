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

package arcs.sdk

import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.SingletonType
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.host.HandleMode
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreManager
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertWithMessage
import java.util.concurrent.Executors
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private typealias Person = ReadSdkPerson_Person

@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
@Suppress("UNCHECKED_CAST", "UNUSED_PARAMETER")
class HandleUtilsTest {
    @get:Rule
    val log = LogRule()

    private lateinit var scheduler: Scheduler
    private lateinit var stores: StoreManager
    private lateinit var manager: EntityHandleManager

    @Before
    fun setUp() = runBlocking {
        RamDisk.clear()
        RamDiskDriverProvider()
        ReferenceModeStorageKey.registerParser()
        stores = StoreManager()
        scheduler = Scheduler(Executors.newSingleThreadExecutor().asCoroutineDispatcher() + Job())
        manager = EntityHandleManager(
            "testArc",
            "testHost",
            FakeTime(),
            scheduler,
            stores = stores
        )
    }

    @After
    fun tearDown() = runBlocking {
        scheduler.waitForIdle()
        stores.waitForIdle()
        manager.close()
        scheduler.cancel()
    }

    @Test
    fun handleUtils_combineTwoUpdatesTest() = runBlocking {
        val collection = createCollectionHandle(STORAGE_KEY_ONE)
        val singleton = createSingletonHandle(STORAGE_KEY_TWO)
        log("Handles ready")

        var x = 0
        var y = 0
        val signalChannel = Channel<Unit>()
        combineUpdates(collection, singleton) { people, e2 ->
            log("Heard update: $people")
            if (people.elementAtOrNull(0)?.name == "George") {
                x += 1
            }
            if (e2?.name == "Martha") {
                y += 1
            }
            launch { signalChannel.send(Unit) }
        }
        collection.dispatchStore(Person("George"))
        signalChannel.receive()
        assertWithMessage("Expected Collection to include George").that(x).isEqualTo(1)
        assertWithMessage("Expected Singleton to not Equal Martha").that(y).isEqualTo(0)
        singleton.dispatchStore(Person("Martha"))
        signalChannel.receive()
        assertWithMessage("Expected Collection to include George").that(x).isEqualTo(2)
        assertWithMessage("Expected Singleton to include Martha").that(y).isEqualTo(1)
    }

    @Test
    fun handleUtils_combineThreeUpdatesTest() = runBlocking {
        val handle1 = createCollectionHandle(STORAGE_KEY_ONE)
        val handle2 = createSingletonHandle(STORAGE_KEY_TWO)
        val handle3 = createCollectionHandle(STORAGE_KEY_THREE)
        log("Handles ready")

        var handle1Tracking = 0
        var handle2Tracking = 0
        var handle3Tracking = 0

        val signalChannel = Channel<Unit>()
        combineUpdates(handle1, handle2, handle3) { e1, e2, e3 ->
            log("Heard update: $e1, $e2, $e3")
            if (e1.elementAtOrNull(0)?.name == "A") {
                handle1Tracking += 1
            }
            if (e2?.name == "B") {
                handle2Tracking += 1
            }
            if (e3.elementAtOrNull(0)?.name == "C") {
                handle3Tracking += 1
            }
            launch { signalChannel.send(Unit) }
        }
        handle1.dispatchStore(Person("A"))
        signalChannel.receive()
        assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(1)
        assertWithMessage("Expected handle2 to not equal B").that(handle2Tracking).isEqualTo(0)
        assertWithMessage("Expected handle3 to not include C").that(handle3Tracking).isEqualTo(0)

        handle2.dispatchStore(Person("B"))
        signalChannel.receive()
        assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(2)
        assertWithMessage("Expected handle2 to equal B").that(handle2Tracking).isEqualTo(1)
        assertWithMessage("Expected handle3 to not include C").that(handle3Tracking).isEqualTo(0)

        handle3.dispatchStore(Person("C"))
        signalChannel.receive()
        assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(3)
        assertWithMessage("Expected handle2 to equal B").that(handle2Tracking).isEqualTo(2)
        assertWithMessage("Expected handle3 to include C").that(handle3Tracking).isEqualTo(1)
    }

    @Test
    fun handleUtils_combineFourUpdatesTest() = runBlocking {
        val handle1 = createCollectionHandle(STORAGE_KEY_ONE)
        val handle2 = createSingletonHandle(STORAGE_KEY_TWO)
        val handle3 = createCollectionHandle(STORAGE_KEY_THREE)
        val handle4 = createSingletonHandle(STORAGE_KEY_FOUR)
        log("Handles ready")

        var handle1Tracking = 0
        var handle2Tracking = 0
        var handle3Tracking = 0
        var handle4Tracking = 0

        val signalChannel = Channel<Unit>()
        combineUpdates(handle1, handle2, handle3, handle4) { e1, e2, e3, e4 ->
            if (e1.elementAtOrNull(0)?.name == "A") {
                handle1Tracking += 1
            }
            if (e2?.name == "B") {
                handle2Tracking += 1
            }
            if (e3.elementAtOrNull(0)?.name == "C") {
                handle3Tracking += 1
            }
            if (e4?.name == "D") {
                handle4Tracking += 1
            }
            launch { signalChannel.send(Unit) }
        }
        handle1.dispatchStore(Person("A"))
        signalChannel.receive()
        assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(1)
        assertWithMessage("Expected handle2 to not equal B").that(handle2Tracking).isEqualTo(0)
        assertWithMessage("Expected handle3 to not include C").that(handle3Tracking).isEqualTo(0)
        assertWithMessage("Expected handle4 to not equal D").that(handle4Tracking).isEqualTo(0)

        handle2.dispatchStore(Person("B"))
        signalChannel.receive()
        assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(2)
        assertWithMessage("Expected handle2 to equal B").that(handle2Tracking).isEqualTo(1)
        assertWithMessage("Expected handle3 to not include C").that(handle3Tracking).isEqualTo(0)
        assertWithMessage("Expected handle4 to not equal D").that(handle4Tracking).isEqualTo(0)

        handle3.dispatchStore(Person("C"))
        signalChannel.receive()
        assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(3)
        assertWithMessage("Expected handle2 to equal B").that(handle2Tracking).isEqualTo(2)
        assertWithMessage("Expected handle3 to include C").that(handle3Tracking).isEqualTo(1)
        assertWithMessage("Expected handle4 to not equal D").that(handle4Tracking).isEqualTo(0)

        handle4.dispatchStore(Person("D"))
        signalChannel.receive()
        assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(4)
        assertWithMessage("Expected handle2 to equal B").that(handle2Tracking).isEqualTo(3)
        assertWithMessage("Expected handle3 to include C").that(handle3Tracking).isEqualTo(2)
        assertWithMessage("Expected handle4 to equal D").that(handle4Tracking).isEqualTo(1)
    }

    @Test
    fun handleUtils_combineTenUpdatesTest() = runBlocking {
        val handle1 = createCollectionHandle(STORAGE_KEY_ONE)
        val handle2 = createSingletonHandle(STORAGE_KEY_TWO)
        val handle3 = createCollectionHandle(STORAGE_KEY_THREE)
        val handle4 = createSingletonHandle(STORAGE_KEY_FOUR)
        val handle5 = createCollectionHandle(STORAGE_KEY_FIVE)
        val handle6 = createSingletonHandle(STORAGE_KEY_SIX)
        val handle7 = createCollectionHandle(STORAGE_KEY_SEVEN)
        val handle8 = createSingletonHandle(STORAGE_KEY_EIGHT)
        val handle9 = createCollectionHandle(STORAGE_KEY_NINE)
        val handle10 = createSingletonHandle(STORAGE_KEY_TEN)
        log("Handles ready")

        var tracking5 = 0
        var tracking6 = 0
        var tracking7 = 0
        var tracking8 = 0
        var tracking9 = 0
        var tracking10 = 0

        val doneYet = Job()

        combineUpdates(
            handle1,
            handle2,
            handle3,
            handle4,
            handle5
        ) { _, _, _, _, _ ->
            tracking5 += 1
        }

        combineUpdates(
            handle1,
            handle2,
            handle3,
            handle4,
            handle5,
            handle6
        ) { _, _, _, _, _, _ ->
            tracking6 += 1
        }

        combineUpdates(
            handle1,
            handle2,
            handle3,
            handle4,
            handle5,
            handle6,
            handle7
        ) { _, _, _, _, _, _, _ ->
            tracking7 += 1
        }

        combineUpdates(
            handle1,
            handle2,
            handle3,
            handle4,
            handle5,
            handle6,
            handle7,
            handle8
        ) { _, _, _, _, _, _, _, _ ->
            tracking8 += 1
        }

        combineUpdates(
            handle1,
            handle2,
            handle3,
            handle4,
            handle5,
            handle6,
            handle7,
            handle8,
            handle9
        ) { _, _, _, _, _, _, _, _, _ ->
            tracking9 += 1
        }

        combineUpdates(
            handle1,
            handle2,
            handle3,
            handle4,
            handle5,
            handle6,
            handle7,
            handle8,
            handle9,
            handle10
        ) { _, _, _, _, _, _, _, _, _, _ ->
            tracking10 += 1

            if (tracking10 == 10) doneYet.complete()
        }

        handle1.dispatchStore(Person("A"))
        handle2.dispatchStore(Person("B"))
        handle3.dispatchStore(Person("C"))
        handle4.dispatchStore(Person("D"))
        handle5.dispatchStore(Person("E"))
        handle6.dispatchStore(Person("F"))
        handle7.dispatchStore(Person("G"))
        handle8.dispatchStore(Person("H"))
        handle9.dispatchStore(Person("I"))
        handle10.dispatchStore(Person("J"))

        doneYet.join()

        assertWithMessage("Expected 5 combineUpdates to be called.")
            .that(tracking5).isEqualTo(5)
        assertWithMessage("Expected 6 combineUpdates to be called.")
            .that(tracking6).isEqualTo(6)
        assertWithMessage("Expected 7 combineUpdates to be called.")
            .that(tracking7).isEqualTo(7)
        assertWithMessage("Expected 8 combineUpdates to be called.")
            .that(tracking8).isEqualTo(8)
        assertWithMessage("Expected 9 combineUpdates to be called.")
            .that(tracking9).isEqualTo(9)
        assertWithMessage("Expected 10 combineUpdates to be called.")
            .that(tracking10).isEqualTo(10)
    }

    private suspend fun createCollectionHandle(
        storageKey: StorageKey
    ) = manager.createHandle(
        HandleSpec(
            READ_WRITE_HANDLE,
            HandleMode.ReadWriteQuery,
            CollectionType(EntityType(Person.SCHEMA)),
            Person
        ),
        storageKey
    ).awaitReady() as ReadWriteQueryCollectionHandle<Person, *>

    private suspend fun createSingletonHandle(
        storageKey: StorageKey
    ) = manager.createHandle(
        HandleSpec(
            READ_WRITE_HANDLE,
            HandleMode.ReadWrite,
            SingletonType(EntityType(Person.SCHEMA)),
            Person
        ),
        storageKey
    ).awaitReady() as ReadWriteSingletonHandle<Person>

    private companion object {
        private const val READ_WRITE_HANDLE = "readWriteHandle"

        private val STORAGE_KEY_ONE = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing"),
            storageKey = RamDiskStorageKey("entity")
        )

        private val STORAGE_KEY_TWO = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing2"),
            storageKey = RamDiskStorageKey("entity2")
        )

        private val STORAGE_KEY_THREE = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing3"),
            storageKey = RamDiskStorageKey("entity3")
        )

        private val STORAGE_KEY_FOUR = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing4"),
            storageKey = RamDiskStorageKey("entity4")
        )

        private val STORAGE_KEY_FIVE = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing5"),
            storageKey = RamDiskStorageKey("entity5")
        )

        private val STORAGE_KEY_SIX = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing6"),
            storageKey = RamDiskStorageKey("entity6")
        )

        private val STORAGE_KEY_SEVEN = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing7"),
            storageKey = RamDiskStorageKey("entity7")
        )

        private val STORAGE_KEY_EIGHT = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing8"),
            storageKey = RamDiskStorageKey("entity8")
        )

        private val STORAGE_KEY_NINE = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing9"),
            storageKey = RamDiskStorageKey("entity9")
        )

        private val STORAGE_KEY_TEN = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing10"),
            storageKey = RamDiskStorageKey("entity10")
        )
    }
}
