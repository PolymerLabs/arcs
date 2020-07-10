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

package arcs.android.storage.service

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.common.ArcId
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SchemaRegistry
import arcs.core.data.SingletonType
import arcs.core.entity.DummyEntity
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StorageKey
import arcs.core.storage.Store
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.DATABASE_NAME_DEFAULT
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.WriteBackForTesting
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.testutil.LogRule
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.android.storage.AndroidDriverAndKeyConfigurator
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [StorageServiceManager]. */
@Suppress("UNCHECKED_CAST", "EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class StorageServiceManagerTest {
    @get:Rule
    val log = LogRule()

    private suspend fun buildManager() =
        StorageServiceManager(coroutineContext, ConcurrentHashMap<StorageKey, Store<*, *, *>>())

    private val time = FakeTime()
    private val scheduler = JvmSchedulerProvider(EmptyCoroutineContext).invoke("test")
    private val ramdiskKey = ReferenceModeStorageKey(
        backingKey = RamDiskStorageKey("backing"),
        storageKey = RamDiskStorageKey("container")
    )
    private val arcId = ArcId.newForTest("foo")
    private val volatileKey = ReferenceModeStorageKey(
        backingKey = VolatileStorageKey(arcId, "backing"),
        storageKey = VolatileStorageKey(arcId, "container")
    )
    private val databaseKey = ReferenceModeStorageKey(
        backingKey = DatabaseStorageKey.Persistent("backing", DummyEntity.SCHEMA_HASH),
        storageKey = DatabaseStorageKey.Persistent("container", DummyEntity.SCHEMA_HASH)
    )

    @Before
    fun setUp() {
        StoreWriteBack.writeBackFactoryOverride = WriteBackForTesting
        AndroidDriverAndKeyConfigurator.configure(
            ApplicationProvider.getApplicationContext(),
            arcId
        )
        SchemaRegistry.register(DummyEntity.SCHEMA)
    }

    @After
    fun tearDown() {
        WriteBackForTesting.clear()
        scheduler.cancel()
        RamDisk.clear()
    }

    @Test
    fun databaseClearAll() = runBlocking {
        testClearAllForKey(databaseKey)
    }

    @Test
    fun ramdiskClearAll() = runBlocking {
        testClearAllForKey(ramdiskKey)
    }

    @Test
    fun volatileClearAll() = runBlocking {
        testClearAllForKey(volatileKey)
    }

    @Test
    fun databaseClearDataBetween() = runBlocking {
        testClearDataBetweenForKey(databaseKey, allRemoved = false)
    }

    @Test
    fun ramdiskClearDataBetween() = runBlocking {
        testClearDataBetweenForKey(ramdiskKey, allRemoved = true)
    }

    @Test
    fun volatileClearDataBetween() = runBlocking {
        testClearDataBetweenForKey(volatileKey, allRemoved = true)
    }

    @Test
    fun resetDatabases() = runBlocking {
        val handle = createCollectionHandle(databaseKey)
        val entity = DummyEntity().apply {
            num = 1.0
            texts = setOf("1", "one")
        }
        handle.dispatchStore(entity)
        log("Wrote entity")

        val manager = buildManager()
        val deferredResult = DeferredResult(coroutineContext)
        log("Resetting databases")
        manager.resetDatabases(deferredResult)

        withTimeout(2000) {
            assertThat(deferredResult.await()).isTrue()
        }

        val newHandle = createCollectionHandle(databaseKey)
        assertThat(newHandle.dispatchFetchAll()).isEmpty()

        // Double check that no tombstones are left.
        val database = DatabaseDriverProvider.manager.getDatabase(DATABASE_NAME_DEFAULT, true)
        val entityKey = databaseKey.backingKey.childKeyWithComponent(entity.entityId!!)
        // Entity is gone, no tombstone left.
        assertThat(database.get(entityKey, DatabaseData.Entity::class, DummyEntity.SCHEMA)).isNull()
        // Collection is gone too.
        assertThat(
            database.get(databaseKey.storageKey, DatabaseData.Collection::class, DummyEntity.SCHEMA)
        ).isNull()
    }

    private suspend fun testClearAllForKey(storageKey: StorageKey) {
        val handle = createSingletonHandle(storageKey)
        val entity = DummyEntity().apply {
            num = 1.0
            texts = setOf("1", "one")
        }
        handle.dispatchStore(entity)
        log("Wrote entity")

        val manager = buildManager()
        val deferredResult = DeferredResult(coroutineContext)
        log("Clearing databases")
        manager.clearAll(deferredResult)

        withTimeout(2000) {
            assertThat(deferredResult.await()).isTrue()
        }

        // Create a new handle (with new Entity manager) to confirm data is gone from storage.
        val newHandle = createSingletonHandle(storageKey)
        assertThat(newHandle.dispatchFetch()).isNull()
    }

    private suspend fun testClearDataBetweenForKey(storageKey: StorageKey, allRemoved: Boolean) {
        val entity1 = DummyEntity().apply { num = 1.0 }
        val entity2 = DummyEntity().apply { num = 2.0 }
        val entity3 = DummyEntity().apply { num = 3.0 }

        val handle = createCollectionHandle(storageKey)
        withTimeout(5000) {
            time.millis = 1L
            handle.dispatchStore(entity1)

            time.millis = 2L
            handle.dispatchStore(entity2)

            time.millis = 3L
            handle.dispatchStore(entity3)
        }
        log("Wrote entities")

        val manager = buildManager()
        val deferredResult = DeferredResult(coroutineContext)

        log("Clearing data created at t=2")
        manager.clearDataBetween(2, 2, deferredResult)

        withTimeout(2000) { assertThat(deferredResult.await()).isTrue() }
        log("Clear complete, asserting")

        // Create a new handle (with new Entity manager) to confirm data is gone from storage.
        val newHandle = createCollectionHandle(storageKey)
        if (allRemoved) {
            assertThat(newHandle.dispatchFetchAll()).isEmpty()
        } else {
            // In case there are remaining entities, the changes should be propagated to the
            // original handle as well.
            assertThat(handle.dispatchFetchAll()).containsExactly(entity1, entity3)
            assertThat(newHandle.dispatchFetchAll()).containsExactly(entity1, entity3)
        }
    }

    private suspend fun createSingletonHandle(storageKey: StorageKey) =
        // Creates a new handle manager each time, to simulate arcs stop/start behavior.
        EntityHandleManager(
            time = time,
            scheduler = scheduler
        ).createHandle(
            HandleSpec(
                "name",
                HandleMode.ReadWrite,
                SingletonType(EntityType(DummyEntity.SCHEMA)),
                DummyEntity
            ),
            storageKey
        ).awaitReady() as ReadWriteSingletonHandle<DummyEntity>

    private suspend fun createCollectionHandle(storageKey: StorageKey) =
        EntityHandleManager(
            time = time,
            scheduler = scheduler
        ).createHandle(
            HandleSpec(
                "name",
                HandleMode.ReadWrite,
                CollectionType(EntityType(DummyEntity.SCHEMA)),
                DummyEntity
            ),
            storageKey
        ).awaitReady() as ReadWriteCollectionHandle<DummyEntity>
}
