package arcs.android.storage.handle

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.core.crdt.CrdtEntity
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
import arcs.core.storage.driver.VolatileEntry
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.SetCallbacks
import arcs.core.storage.handle.SingletonCallbacks
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.mock
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
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

    private val singletonRefKey = RamDiskStorageKey("single-ent")
    private val singletonKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = singletonRefKey
    )

    private val setRefKey = RamDiskStorageKey("set-ent")
    private val setKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = setRefKey
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
            connectionFactory = TestConnectionFactory(app)
        )
    }

    @Test
    fun singleton_dereferenceEntity() = runBlocking {
        val singleton1Handle =
            handleManager.rawEntitySingletonHandle(storageKey = singletonKey, schema = schema)
        val singleton1Handle2 =
            handleManager.rawEntitySingletonHandle(storageKey = singletonKey, schema = schema)
        singleton1Handle.store(entity1)

        // Create a second handle for the second entity, so we can store it.
        val storageKey1 = ReferenceModeStorageKey(backingKey, RamDiskStorageKey("entity2"))
        val singleton2Handle = handleManager.rawEntitySingletonHandle(
            storageKey = storageKey1, schema = schema
        )
        val storageKey2 = ReferenceModeStorageKey(backingKey, RamDiskStorageKey("entity2"))
        val singleton2Handle2 = handleManager.rawEntitySingletonHandle(
            storageKey = storageKey2, schema = schema
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
        val setHandle = handleManager.rawEntitySetHandle(setKey, schema)
        setHandle.store(entity1)
        setHandle.store(entity2)

        val secondHandle = handleManager.rawEntitySetHandle(setKey, schema)
        secondHandle.fetchAll().also { assertThat(it).hasSize(2) }.forEach { entity ->
            val expectedBestFriend = if (entity.id == "entity1") entity2 else entity1
            val actualBestFriend = (entity.singletons["best_friend"] as Reference)
                .dereference(coroutineContext)
            assertThat(actualBestFriend).isEqualTo(expectedBestFriend)
        }
    }

    @Test
    fun testCreateReferenceSingletonHandle() = runBlocking {
        val singletonHandle = handleManager.referenceSingletonHandle(singletonRefKey, schema)
        val entity1Ref = singletonHandle.createReference(entity1, backingKey)
        singletonHandle.store(entity1Ref)

        // Now read back from a different handle
        val readbackHandle = handleManager.referenceSingletonHandle(singletonRefKey, schema)
        val readBack = readbackHandle.fetch()!!
        assertThat(readBack).isEqualTo(entity1Ref)

        // Reference should be dead.
        assertThat(readBack.isAlive(coroutineContext)).isFalse()
        assertThat(readBack.isDead(coroutineContext)).isTrue()

        // Stash entity1 in the RamDisk manually, so it becomes alive.
        RamDisk.memory[readBack.storageKey.childKeyWithComponent(readBack.id)] = VolatileEntry(
            CrdtEntity.Data(VersionMap("foo" to 1), entity1) {
                if (it is Reference) it
                else CrdtEntity.Reference.buildReference(it)
            },
            0
        )

        // Reference should be alive.
        assertThat(readBack.isAlive(coroutineContext)).isTrue()
        assertThat(readBack.isDead(coroutineContext)).isFalse()

        // Now dereference our read-back reference.
        assertThat(readBack.dereference(coroutineContext)).isEqualTo(entity1)
    }

    @Test
    fun testCreateReferenceSetHandle() = runBlocking {
        val setHandle = handleManager.referenceSetHandle(singletonRefKey, schema)
        val entity1Ref = setHandle.createReference(entity1, backingKey)
        val entity2Ref = setHandle.createReference(entity2, backingKey)
        setHandle.store(entity1Ref)
        setHandle.store(entity2Ref)

        // Now read back from a different handle
        val readbackHandle = handleManager.referenceSetHandle(singletonRefKey, schema)
        val readBack = readbackHandle.fetchAll()
        assertThat(readBack).containsExactly(entity1Ref, entity2Ref)

        // References should be dead.
        val readBackEntity1Ref = readBack.find { it.id == entity1.id }!!
        val readBackEntity2Ref = readBack.find { it.id == entity2.id }!!
        assertThat(readBackEntity1Ref.isAlive(coroutineContext)).isFalse()
        assertThat(readBackEntity1Ref.isDead(coroutineContext)).isTrue()
        assertThat(readBackEntity2Ref.isAlive(coroutineContext)).isFalse()
        assertThat(readBackEntity2Ref.isDead(coroutineContext)).isTrue()

        // Stash the entities in the RamDisk manually, so it becomes alive.
        val readBackEntity1Key =
            readBackEntity1Ref.storageKey.childKeyWithComponent(readBackEntity1Ref.id)
        RamDisk.memory[readBackEntity1Key] = VolatileEntry(
            CrdtEntity.Data(VersionMap("foo" to 1), entity1) {
                if (it is Reference) it
                else CrdtEntity.Reference.buildReference(it)
            },
            0
        )
        val readBackEntity2Key =
            readBackEntity2Ref.storageKey.childKeyWithComponent(readBackEntity2Ref.id)
        RamDisk.memory[readBackEntity2Key] = VolatileEntry(
            CrdtEntity.Data(VersionMap("foo" to 1), entity2) {
                if (it is Reference) it
                else CrdtEntity.Reference.buildReference(it)
            },
            0
        )

        // References should be alive.
        assertThat(readBackEntity1Ref.isAlive(coroutineContext)).isTrue()
        assertThat(readBackEntity1Ref.isDead(coroutineContext)).isFalse()
        assertThat(readBackEntity2Ref.isAlive(coroutineContext)).isTrue()
        assertThat(readBackEntity2Ref.isDead(coroutineContext)).isFalse()

        // Now dereference our read-back references.
        assertThat(readBackEntity1Ref.dereference(coroutineContext)).isEqualTo(entity1)
        assertThat(readBackEntity2Ref.dereference(coroutineContext)).isEqualTo(entity2)
    }

    private fun testMapForKey(key: StorageKey) = VersionMap(key.toKeyString() to 1)

    @Test
    fun set_onHandleUpdate() = runBlocking<Unit> {
        val testCallback1 = mock<SetCallbacks<RawEntity>>()
        val testCallback2 = mock<SetCallbacks<RawEntity>>()
        val firstHandle = handleManager.rawEntitySetHandle(setKey, schema, testCallback1)
        val secondHandle = handleManager.rawEntitySetHandle(setKey, schema, testCallback2)

        val expectedAdd = CrdtSet.Operation.Add(
            setKey.toKeyString(),
            testMapForKey(setKey),
            entity1
        )
        secondHandle.store(entity1)
        verify(testCallback1).onUpdate(firstHandle, expectedAdd)
        verify(testCallback2).onUpdate(secondHandle, expectedAdd)

        firstHandle.remove(entity1)
        val expectedRemove = CrdtSet.Operation.Remove(
            setKey.toKeyString(),
            testMapForKey(setKey),
            entity1
        )
        verify(testCallback1).onUpdate(firstHandle, expectedRemove)
        verify(testCallback2).onUpdate(secondHandle, expectedRemove)
    }

    @Test
    fun singleton_OnHandleUpdate() = runBlocking<Unit> {
        val testCallback1 = mock<SingletonCallbacks<RawEntity>>()
        val testCallback2 = mock<SingletonCallbacks<RawEntity>>()
        val firstHandle = handleManager.rawEntitySingletonHandle(
            storageKey = singletonKey,
            schema = schema,
            callbacks = testCallback1
        )
        val secondHandle = handleManager.rawEntitySingletonHandle(
            storageKey = singletonKey,
            schema = schema,
            callbacks = testCallback2
        )
        secondHandle.store(entity1)
        val expectedAdd = CrdtSingleton.Operation.Update(
            singletonKey.toKeyString(),
            testMapForKey(singletonKey),
            entity1
        )
        verify(testCallback1).onUpdate(firstHandle, expectedAdd)
        verify(testCallback2).onUpdate(secondHandle, expectedAdd)
        firstHandle.clear()

        val expectedRemove = CrdtSingleton.Operation.Clear<RawEntity>(
            singletonKey.toKeyString(),
            testMapForKey(singletonKey)
        )
        verify(testCallback1).onUpdate(firstHandle, expectedRemove)
        verify(testCallback2).onUpdate(secondHandle, expectedRemove)
    }

    @Test
    fun set_syncOnRegister() = runBlocking<Unit> {
        val testCallback = mock<SetCallbacks<RawEntity>>()
        val firstHandle = handleManager.rawEntitySetHandle(setKey, schema, testCallback)
        verify(testCallback).onSync(firstHandle)
        firstHandle.fetchAll()
        verify(testCallback).onSync(firstHandle)
    }

    @Test
    fun singleton_syncOnRegister() = runBlocking<Unit> {
        val testCallback = mock<SingletonCallbacks<RawEntity>>()
        val firstHandle = handleManager.rawEntitySingletonHandle(
            storageKey = setKey,
            schema = schema,
            callbacks = testCallback
        )
        verify(testCallback).onSync(firstHandle)
        firstHandle.fetch()
        verify(testCallback).onSync(firstHandle)
    }
}
