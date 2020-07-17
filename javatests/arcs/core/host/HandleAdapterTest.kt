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

package arcs.core.host

import arcs.core.common.Id
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.SingletonType
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteQueryCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.testutil.handles.dispatchClear
import arcs.core.testutil.handles.dispatchClose
import arcs.core.testutil.handles.dispatchCreateReference
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchIsEmpty
import arcs.core.testutil.handles.dispatchQuery
import arcs.core.testutil.handles.dispatchRemove
import arcs.core.testutil.handles.dispatchSize
import arcs.core.testutil.handles.dispatchStore
import arcs.core.testutil.runTest
import arcs.core.util.Scheduler
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private typealias Person = ReadPerson_Person
private typealias QueryPerson = QueryPerson_Person

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
@Suppress("UNCHECKED_CAST")
class HandleAdapterTest {
    private lateinit var manager: EntityHandleManager
    private val idGenerator = Id.Generator.newForTest("session")
    private val schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
    private lateinit var scheduler: Scheduler

    @Before
    fun setUp() = runBlocking {
        DriverAndKeyConfigurator.configure(null)
        scheduler = schedulerProvider("tests")
        manager = EntityHandleManager(
            "testArc",
            "",
            FakeTime(),
            scheduler = scheduler
        )
    }

    @After
    fun tearDown() {
        RamDisk.clear()
        scheduler.cancel()
    }

    @Test
    fun singletonHandleAdapter_readOnlyCantWrite() = runTest {
        val readOnlyHandle = manager.createHandle(
            HandleSpec(
                READ_ONLY_HANDLE,
                HandleMode.Read,
                SingletonType(EntityType(Person.SCHEMA)),
                Person
            ),
            STORAGE_KEY
        )

        assertThat(readOnlyHandle).isInstanceOf(ReadSingletonHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(WriteSingletonHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(ReadWriteSingletonHandle::class.java)
    }

    @Test
    fun singletonHandleAdapter_writeOnlyCantRead() = runTest {
        val writeOnlyHandle = manager.createHandle(
            HandleSpec(
                WRITE_ONLY_HANDLE,
                HandleMode.Write,
                SingletonType(EntityType(Person.SCHEMA)),
                Person
            ),
            STORAGE_KEY
        )
        assertThat(writeOnlyHandle).isInstanceOf(WriteSingletonHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadSingletonHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadWriteSingletonHandle::class.java)
    }

    @Test
    fun singletonHandleAdapter_createReference() = runTest {
        val handle = manager.createHandle(
            HandleSpec(
                READ_WRITE_HANDLE,
                HandleMode.ReadWrite,
                SingletonType(EntityType(Person.SCHEMA)),
                Person
            ),
            STORAGE_KEY
        ) as ReadWriteSingletonHandle<Person>
        val entity = Person("Watson")

        // Fails when there's no entityId.
        var e = assertSuspendingThrows(IllegalArgumentException::class) {
            handle.dispatchCreateReference(entity)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Entity must have an ID before it can be referenced."
        )

        entity.ensureEntityFields(idGenerator, READ_WRITE_HANDLE, FakeTime())

        // Fails when the entity is not in the collection.
        e = assertSuspendingThrows(IllegalArgumentException::class) {
            handle.dispatchCreateReference(entity)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Entity is not stored in the Singleton."
        )
        handle.dispatchStore(entity)

        val reference = handle.dispatchCreateReference(entity)
        assertThat(reference.schemaHash).isEqualTo(Person.SCHEMA.hash)
        assertThat(reference.entityId).isEqualTo(entity.entityId)
        assertThat(reference.dereference()).isEqualTo(entity)
    }

    @Test
    fun singleton_noOpsAfterClose() = runTest {
        val handle = manager.createHandle(
            HandleSpec(
                READ_WRITE_HANDLE,
                HandleMode.ReadWrite,
                SingletonType(EntityType(Person.SCHEMA)),
                Person
            ),
            STORAGE_KEY
        ) as ReadWriteSingletonHandle<Person>

        handle.dispatchStore(Person("test"))
        handle.dispatchClose()

        assertSuspendingThrows(IllegalStateException::class) { handle.dispatchStore(Person("x")) }
        assertSuspendingThrows(IllegalStateException::class) { handle.dispatchClear() }
        assertSuspendingThrows(IllegalStateException::class) { handle.dispatchFetch() }
    }

    @Test
    fun collectionHandleAdapter_readOnlyCantWrite() = runTest {
        val readOnlyHandle = manager.createHandle(
            HandleSpec(
                READ_ONLY_HANDLE,
                HandleMode.Read,
                CollectionType(EntityType(Person.SCHEMA)),
                Person
            ),
            STORAGE_KEY
        )

        assertThat(readOnlyHandle).isInstanceOf(ReadCollectionHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(WriteCollectionHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(ReadWriteCollectionHandle::class.java)
    }

    @Test
    fun collectionHandleAdapter_writeOnlyCantRead() = runTest {
        val writeOnlyHandle = manager.createHandle(
            HandleSpec(
                WRITE_ONLY_HANDLE,
                HandleMode.Write,
                CollectionType(EntityType(Person.SCHEMA)),
                Person
            ),
            STORAGE_KEY
        )

        assertThat(writeOnlyHandle).isInstanceOf(WriteCollectionHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadCollectionHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadWriteCollectionHandle::class.java)
    }

    @Ignore("b/157390221 - Deflake")
    @Test
    fun collectionHandleAdapter_createReference() = runTest {
        val handle = manager.createHandle(
            HandleSpec(
                READ_WRITE_HANDLE,
                HandleMode.ReadWrite,
                CollectionType(EntityType(Person.SCHEMA)),
                Person
            ),
            STORAGE_KEY
        ) as ReadWriteCollectionHandle<Person>
        val entity = Person("Watson")

        // Fails when there's no entityId.
        var e = assertSuspendingThrows(IllegalArgumentException::class) {
            handle.dispatchCreateReference(entity)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Entity must have an ID before it can be referenced."
        )

        entity.ensureEntityFields(idGenerator, READ_WRITE_HANDLE, FakeTime())

        // Fails when the entity is not in the collection.
        e = assertSuspendingThrows(IllegalArgumentException::class) {
            handle.dispatchCreateReference(entity)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Entity is not stored in the Collection."
        )

        handle.dispatchStore(entity)

        // Wait for the storage to make it down to the driver, so dereferencing works.
        delay(150)

        val reference = handle.dispatchCreateReference(entity)
        assertThat(reference.schemaHash).isEqualTo(Person.SCHEMA.hash)
        assertThat(reference.entityId).isEqualTo(entity.entityId)
        assertThat(reference.dereference()).isEqualTo(entity)
    }

    @Test
    fun collection_noOpsAfterClose() = runTest {
        val handle = manager.createHandle(
            HandleSpec(
                READ_WRITE_HANDLE,
                HandleMode.ReadWriteQuery,
                CollectionType(EntityType(QueryPerson.SCHEMA)),
                QueryPerson
            ),
            STORAGE_KEY
        ) as ReadWriteQueryCollectionHandle<Person, Any>
        val testPerson = Person("test")
        val otherPerson = Person("other")

        handle.dispatchStore(testPerson)
        handle.dispatchClose()

        assertSuspendingThrows(IllegalStateException::class) { handle.dispatchStore(otherPerson) }
        assertSuspendingThrows(IllegalStateException::class) { handle.dispatchRemove(testPerson) }
        assertSuspendingThrows(IllegalStateException::class) { handle.dispatchClear() }
        assertSuspendingThrows(IllegalStateException::class) { handle.dispatchFetchAll() }
        assertSuspendingThrows(IllegalStateException::class) { handle.dispatchSize() }
        assertSuspendingThrows(IllegalStateException::class) { handle.dispatchIsEmpty() }
        assertSuspendingThrows(IllegalStateException::class) { handle.dispatchQuery("other") }
    }

    private companion object {
        private const val READ_ONLY_HANDLE = "readOnlyHandle"
        private const val WRITE_ONLY_HANDLE = "writeOnlyHandle"
        private const val READ_WRITE_HANDLE = "readWriteHandle"

        private val STORAGE_KEY = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing"),
            storageKey = RamDiskStorageKey("entity")
        )
    }
}
