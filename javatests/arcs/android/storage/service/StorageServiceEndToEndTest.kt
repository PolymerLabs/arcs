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
import arcs.core.entity.InlineDummyEntity
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.DriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreManager
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.WriteBackForTesting
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
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [StorageServiceManager]. */
@Suppress("UNCHECKED_CAST", "EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class StorageServiceEndToEndTest {
    @get:Rule
    val log = LogRule()

    private suspend fun buildManager() =
        StorageServiceManager(coroutineContext, ConcurrentHashMap())
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
        AndroidDriverAndKeyConfigurator.configure(ApplicationProvider.getApplicationContext())
        SchemaRegistry.register(DummyEntity.SCHEMA)
        SchemaRegistry.register(InlineDummyEntity.SCHEMA)
    }

    @After
    fun tearDown() {
        WriteBackForTesting.clear()
        scheduler.cancel()
        RamDisk.clear()
        DriverFactory.clearRegistrations()
    }

    @Test
    fun writeThenRead_inlineData_inCollection_onDatabase() = runBlocking {
        val handle = createCollectionHandle(databaseKey)
        val entity = entityForTest()

        handle.dispatchStore(entity)

        val handle2 = createCollectionHandle(databaseKey)
        val data = handle2.fetchAll()
        assertThat(data.size).isEqualTo(1)
        assertThat(data.toList()[0]).isEqualTo(entity)
    }

    @Test
    fun writeThenRead_inlineData_inCollection_onRamdisk() = runBlocking {
        val handle = createCollectionHandle(ramdiskKey)
        val entity = entityForTest()

        handle.dispatchStore(entity)

        val handle2 = createCollectionHandle(ramdiskKey)
        val data = handle2.fetchAll()
        assertThat(data.size).isEqualTo(1)
        assertThat(data.toList()[0]).isEqualTo(entity)
    }

    @Test
    fun writeThenRead_inlineData_inCollection_onVolatile() = runBlocking {
        val handle = createCollectionHandle(volatileKey)
        val entity = entityForTest()

        handle.dispatchStore(entity)

        val handle2 = createCollectionHandle(volatileKey)
        val data = handle2.fetchAll()
        assertThat(data.size).isEqualTo(1)
        assertThat(data.toList()[0]).isEqualTo(entity)
    }

    private fun entityForTest() = DummyEntity().apply {
        inlineEntity = InlineDummyEntity().apply {
            text = "inline"
        }
        inlineList = listOf(
            InlineDummyEntity().apply { text = "1" },
            InlineDummyEntity().apply { text = "2" },
            InlineDummyEntity().apply { text = "3" }
        )
        inlines = setOf(
            InlineDummyEntity().apply { text = "C1" },
            InlineDummyEntity().apply { text = "C2" },
            InlineDummyEntity().apply { text = "C3" }
        )
    }

    private suspend fun createSingletonHandle(storageKey: StorageKey) =
        // Creates a new handle manager each time, to simulate arcs stop/start behavior.
        EntityHandleManager(
            time = time,
            scheduler = scheduler,
            storageEndpointManager = DirectStorageEndpointManager(StoreManager())
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
            scheduler = scheduler,
            storageEndpointManager = DirectStorageEndpointManager(StoreManager())
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
