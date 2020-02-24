package arcs.android.storage.handle

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
import arcs.core.storage.Callbacks
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.testutil.TestBindingDelegate
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.mock
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.times
import org.mockito.Mockito.verify


@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class AndroidHandleManagerTest {
    private lateinit var app: Application

    val entity1 = RawEntity(
        "entity1",
        singletons=mapOf(
            "name" to "Jason".toReferencable(),
            "age" to 21.toReferencable(),
            "is_cool" to false.toReferencable()
        ),
        collections=emptyMap()
    )

    val entity2 = RawEntity(
        "entity2",
        singletons=mapOf(
            "name" to "Jason".toReferencable(),
            "age" to 22.toReferencable(),
            "is_cool" to true.toReferencable()
        ),
        collections=emptyMap()
    )

    private val schema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(
            singletons = mapOf(
                "name" to FieldType.Text,
                "age" to FieldType.Number,
                "is_cool" to FieldType.Boolean
            ),
            collections = emptyMap()
        ),
        "1234acf"
    )

    private val singletonKey = ReferenceModeStorageKey(
        backingKey = RamDiskStorageKey("single-back"),
        storageKey = RamDiskStorageKey("single-ent")
    )

    private val setKey = ReferenceModeStorageKey(
        backingKey = RamDiskStorageKey("set-back"),
        storageKey = RamDiskStorageKey("set-ent")
    )

    @Before
    fun setUp() {
        RamDisk.clear()
        app = ApplicationProvider.getApplicationContext()
        app.setTheme(R.style.Theme_AppCompat);

        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }

    fun handleManagerTest(block: suspend (HandleManager) -> Unit) {
        val scenario = ActivityScenario.launch(TestActivity::class.java)

        scenario.moveToState(Lifecycle.State.STARTED)

        scenario.onActivity { activity ->
            runBlocking {
                val hf = AndroidHandleManager(
                    lifecycle = activity.lifecycle,
                    context = activity,
                    connectionFactory = DefaultConnectionFactory(activity, TestBindingDelegate(app))
                )
                block(hf)
            }
        }

        scenario.close()
    }

    @Test
    fun testCreateSingletonHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val singletonHandle = hm.singletonHandle(singletonKey, schema)
            singletonHandle.store(entity1)

            // Now read back from a different handle
            val readbackHandle = hm.singletonHandle(singletonKey, schema)
            val readBack = readbackHandle.fetch()
            assertThat(readBack).isEqualTo(entity1)
        }
    }

    @Test
    fun testCreateSetHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val setHandle = hm.setHandle(setKey, schema)
            setHandle.store(entity1)
            setHandle.store(entity2)

            // Now read back from a different handle
            val secondHandle = hm.setHandle(setKey, schema)
            val readBack = secondHandle.fetchAll()
            assertThat(readBack).containsExactly(entity1, entity2)
        }
    }

    private fun testMapForKey(key: StorageKey) = VersionMap(key.toKeyString() to 1)

    @Test
    fun testSetHandleOnUpdate()  = runBlockingTest {
        handleManagerTest { hm ->
            val testCallback1 = mock<Callbacks<CrdtSet.IOperation<RawEntity>>>()
            val testCallback2 = mock<Callbacks<CrdtSet.IOperation<RawEntity>>>()
            val firstHandle = hm.setHandle(setKey, schema, testCallback1)
            val secondHandle = hm.setHandle(setKey, schema, testCallback2)

            val expectedAdd = CrdtSet.Operation.Add(
                setKey.toKeyString(),
                testMapForKey(setKey),
                entity1
            )
            secondHandle.store(entity1)
            verify(testCallback1, times(1)).onUpdate(expectedAdd)
            verify(testCallback2, times(1)).onUpdate(expectedAdd)

            firstHandle.remove(entity1)
            val expectedRemove = CrdtSet.Operation.Remove(
                setKey.toKeyString(),
                testMapForKey(setKey),
                entity1
            )
            verify(testCallback1, times(1)).onUpdate(expectedRemove)
            verify(testCallback2, times(1)).onUpdate(expectedRemove)
        }
    }

    @Test
    fun testSingletonHandleOnUpdate() = runBlockingTest {
        handleManagerTest { hm ->
            val testCallback1 = mock<Callbacks<CrdtSingleton.IOperation<RawEntity>>>()
            val testCallback2 = mock<Callbacks<CrdtSingleton.IOperation<RawEntity>>>()
            val firstHandle = hm.singletonHandle(singletonKey, schema, testCallback1)
            val secondHandle = hm.singletonHandle(singletonKey, schema, testCallback2)
            secondHandle.store(entity1)
            val expectedAdd = CrdtSingleton.Operation.Update(
                singletonKey.toKeyString(),
                testMapForKey(singletonKey),
                entity1
            )
            verify(testCallback1, times(1)).onUpdate(expectedAdd)
            verify(testCallback2, times(1)).onUpdate(expectedAdd)
            firstHandle.clear()

            val expectedRemove = CrdtSingleton.Operation.Clear<RawEntity>(
                singletonKey.toKeyString(),
                testMapForKey(singletonKey)
            )
            verify(testCallback1, times(1)).onUpdate(expectedRemove)
            verify(testCallback2, times(1)).onUpdate(expectedRemove)
        }
    }

    @Test
    fun testSetSyncOnRegister() = runBlockingTest {
        handleManagerTest { hm ->
            val testCallback = mock<Callbacks<CrdtSet.IOperation<RawEntity>>>()
            val firstHandle = hm.setHandle(setKey, schema, testCallback)
            verify(testCallback, times(1)).onSync()
            firstHandle.fetchAll()
            verify(testCallback, times(1)).onSync()
        }
    }

    @Test
    fun testSingletonSyncOnRegister() = runBlockingTest {
        handleManagerTest { hm ->
            val testCallback = mock<Callbacks<CrdtSingleton.IOperation<RawEntity>>>()
            val firstHandle = hm.singletonHandle(setKey, schema, testCallback)
            verify(testCallback, times(1)).onSync()
            firstHandle.fetch()
            verify(testCallback, times(1)).onSync()
        }
    }
}
