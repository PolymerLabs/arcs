package arcs.android.storage.handle

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
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
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.SetCallbacks
import arcs.core.storage.handle.SingletonCallbacks
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.testutil.TestBindingDelegate
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.mock
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.times
import org.mockito.Mockito.verify

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class AndroidHandleManagerTest : LifecycleOwner {
    private lateinit var lifecycle: LifecycleRegistry
    override fun getLifecycle() = lifecycle

    private lateinit var app: Application

    private val backingKey = RamDiskStorageKey("entities")

    private lateinit var handleManager: HandleManager

    val entity1 = RawEntity(
        "entity1",
        singletons = mapOf(
            "name" to "Jason".toReferencable(),
            "age" to 21.toReferencable(),
            "is_cool" to false.toReferencable(),
            "best_friend" to Reference("entity2", backingKey, null)
        ),
        collections = emptyMap()
    )

    val entity2 = RawEntity(
        "entity2",
        singletons = mapOf(
            "name" to "Jason".toReferencable(),
            "age" to 22.toReferencable(),
            "is_cool" to true.toReferencable(),
            "best_friend" to Reference("entity1", backingKey, null)
        ),
        collections = emptyMap()
    )

    private val schema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(
            singletons = mapOf(
                "name" to FieldType.Text,
                "age" to FieldType.Number,
                "is_cool" to FieldType.Boolean,
                "best_friend" to FieldType.EntityRef("1234acf")
            ),
            collections = emptyMap()
        ),
        "1234acf"
    )

    private val singletonKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = RamDiskStorageKey("single-ent")
    )

    private val setKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = RamDiskStorageKey("set-ent")
    )

    @Before
    fun setUp() {
        RamDisk.clear()
        lifecycle = LifecycleRegistry(this).apply {
            setCurrentState(Lifecycle.State.CREATED)
            setCurrentState(Lifecycle.State.STARTED)
            setCurrentState(Lifecycle.State.RESUMED)
        }
        app = ApplicationProvider.getApplicationContext()

        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)

        handleManager = AndroidHandleManager(
            lifecycle = lifecycle,
            context = app,
            connectionFactory = DefaultConnectionFactory(app, TestBindingDelegate(app))
        )
    }

    @Test
    fun singleton_dereferenceEntity() = runBlocking {
        val singleton1Handle = handleManager.singletonHandle(singletonKey, schema)
        val singleton1Handle2 = handleManager.singletonHandle(singletonKey, schema)
        singleton1Handle.store(entity1)

        // Create a second handle for the second entity, so we can store it.
        val singleton2Handle = handleManager.singletonHandle(
            ReferenceModeStorageKey(backingKey, RamDiskStorageKey("entity2")),
            schema
        )
        val singleton2Handle2 = handleManager.singletonHandle(
            ReferenceModeStorageKey(backingKey, RamDiskStorageKey("entity2")),
            schema
        )
        singleton2Handle.store(entity2)

        // Now read back entity1, and dereference its best_friend.
        val dereferencedEntity2 =
            (singleton1Handle2.fetch()!!.singletons["best_friend"] as Reference)
                .also {
                    // Check that it's alive
                    assertThat(it.isAlive(coroutineContext)).isTrue()
                }
                .dereference(coroutineContext)
        assertThat(dereferencedEntity2).isEqualTo(entity2)

        // Do the same for entity2's best_friend
        val dereferencedEntity1 =
            (singleton2Handle2.fetch()!!.singletons["best_friend"] as Reference)
                .dereference(coroutineContext)
        assertThat(dereferencedEntity1).isEqualTo(entity1)
    }

    @Test
    fun set_dereferenceEntity () = runBlocking {
        val setHandle = handleManager.setHandle(setKey, schema)
        setHandle.store(entity1)
        setHandle.store(entity2)

        val secondHandle = handleManager.setHandle(setKey, schema)
        secondHandle.fetchAll().also { assertThat(it).hasSize(2) }.forEach { entity ->
            val expectedBestFriend = if (entity.id == "entity1") entity2 else entity1
            val actualBestFriend = (entity.singletons["best_friend"] as Reference)
                .dereference(coroutineContext)
            assertThat(actualBestFriend).isEqualTo(expectedBestFriend)
        }
    }

    private fun testMapForKey(key: StorageKey) = VersionMap(key.toKeyString() to 1)

    @Test
    fun set_onHandleUpdate() = runBlocking<Unit> {
        val testCallback1 = mock<SetCallbacks<RawEntity>>()
        val testCallback2 = mock<SetCallbacks<RawEntity>>()
        val firstHandle = handleManager.setHandle(setKey, schema, testCallback1)
        val secondHandle = handleManager.setHandle(setKey, schema, testCallback2)

        val expectedAdd = CrdtSet.Operation.Add(
            setKey.toKeyString(),
            testMapForKey(setKey),
            entity1
        )
        secondHandle.store(entity1)
        verify(testCallback1, times(1)).onUpdate(firstHandle, expectedAdd)
        verify(testCallback2, times(1)).onUpdate(secondHandle, expectedAdd)

        firstHandle.remove(entity1)
        val expectedRemove = CrdtSet.Operation.Remove(
            setKey.toKeyString(),
            testMapForKey(setKey),
            entity1
        )
        verify(testCallback1, times(1)).onUpdate(firstHandle, expectedRemove)
        verify(testCallback2, times(1)).onUpdate(secondHandle, expectedRemove)
    }

    @Test
    fun singleton_OnHandleUpdate() = runBlocking<Unit> {
        val testCallback1 = mock<SingletonCallbacks<RawEntity>>()
        val testCallback2 = mock<SingletonCallbacks<RawEntity>>()
        val firstHandle = handleManager.singletonHandle(singletonKey, schema, testCallback1)
        val secondHandle = handleManager.singletonHandle(singletonKey, schema, testCallback2)
        secondHandle.store(entity1)
        val expectedAdd = CrdtSingleton.Operation.Update(
            singletonKey.toKeyString(),
            testMapForKey(singletonKey),
            entity1
        )
        verify(testCallback1, times(1)).onUpdate(firstHandle, expectedAdd)
        verify(testCallback2, times(1)).onUpdate(secondHandle, expectedAdd)
        firstHandle.clear()

        val expectedRemove = CrdtSingleton.Operation.Clear<RawEntity>(
            singletonKey.toKeyString(),
            testMapForKey(singletonKey)
        )
        verify(testCallback1, times(1)).onUpdate(firstHandle, expectedRemove)
        verify(testCallback2, times(1)).onUpdate(secondHandle, expectedRemove)
    }

    @Test
    fun set_syncOnRegister() = runBlocking<Unit> {
        val testCallback = mock<SetCallbacks<RawEntity>>()
        val firstHandle = handleManager.setHandle(setKey, schema, testCallback)
        verify(testCallback, times(1)).onSync(firstHandle)
        firstHandle.fetchAll()
        verify(testCallback, times(1)).onSync(firstHandle)
    }

    @Test
    fun singleton_syncOnRegister() = runBlocking<Unit> {
        val testCallback = mock<SingletonCallbacks<RawEntity>>()
        val firstHandle = handleManager.singletonHandle(setKey, schema, testCallback)
        verify(testCallback, times(1)).onSync(firstHandle)
        firstHandle.fetch()
        verify(testCallback, times(1)).onSync(firstHandle)
    }
}
