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
import arcs.core.entity.HandleContainerType
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
import arcs.jvm.util.testutil.TimeImpl
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
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

    @Before
    fun setUp() {
        DriverAndKeyConfigurator.configure(null)
        manager = EntityHandleManager(
            "testArc",
            "",
            TimeImpl()
        )
    }

    @After
    fun tearDown() {
        RamDisk.clear()
    }

    @Test
    fun singletonHandleAdapter_readOnlyCantWrite() = runBlockingTest {
        val readOnlyHandle = manager.createHandle(
            HandleSpec(
                READ_ONLY_HANDLE,
                HandleMode.Read,
                HandleContainerType.Singleton,
                Person
            ),
            STORAGE_KEY
        )

        assertThat(readOnlyHandle).isInstanceOf(ReadSingletonHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(WriteSingletonHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(ReadWriteSingletonHandle::class.java)
    }

    @Test
    fun singletonHandleAdapter_writeOnlyCantRead() = runBlockingTest {
        val writeOnlyHandle = manager.createHandle(
            HandleSpec(
                WRITE_ONLY_HANDLE,
                HandleMode.Write,
                HandleContainerType.Singleton,
                Person
            ),
            STORAGE_KEY
        )
        assertThat(writeOnlyHandle).isInstanceOf(WriteSingletonHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadSingletonHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadWriteSingletonHandle::class.java)
    }

    @Test
    fun singletonHandleAdapter_createReference() = runBlocking {
        val handle = manager.createHandle(
            HandleSpec(
                READ_WRITE_HANDLE,
                HandleMode.ReadWrite,
                HandleContainerType.Singleton,
                Person
            ),
            STORAGE_KEY
        ) as ReadWriteSingletonHandle<Person>
        val entity = Person("Watson")

        // Fails when there's no entityId.
        var e = assertSuspendingThrows(IllegalArgumentException::class) {
            handle.createReference(entity)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Entity must have an ID before it can be referenced."
        )

        entity.ensureEntityFields(idGenerator, READ_WRITE_HANDLE, TimeImpl())

        // Fails when the entity is not in the collection.
        e = assertSuspendingThrows(IllegalArgumentException::class) {
            handle.createReference(entity)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Entity is not stored in the Singleton."
        )

        handle.store(entity)

        val reference = handle.createReference(entity)
        assertThat(reference.schemaHash).isEqualTo(Person.SCHEMA.hash)
        assertThat(reference.entityId).isEqualTo(entity.entityId)
        assertThat(reference.dereference()).isEqualTo(entity)
    }

    @Test
    fun singleton_noOpsAfterClose() = runBlockingTest {
       val handle = manager.createHandle(
           HandleSpec(
               READ_WRITE_HANDLE,
               HandleMode.ReadWrite,
               HandleContainerType.Singleton,
               Person
           ),
           STORAGE_KEY
       ) as ReadWriteSingletonHandle<Person>
        handle.store(Person("test"))
        handle.close()
        assertSuspendingThrows(IllegalStateException::class) { handle.store(Person("other")) }
        assertSuspendingThrows(IllegalStateException::class) { handle.clear() }
        assertSuspendingThrows(IllegalStateException::class) { handle.fetch() }
    }

    @Test
    fun collectionHandleAdapter_readOnlyCantWrite() = runBlockingTest {
        val readOnlyHandle = manager.createHandle(
            HandleSpec(
                READ_ONLY_HANDLE,
                HandleMode.Read,
                HandleContainerType.Collection,
                Person
            ),
            STORAGE_KEY
        )

        assertThat(readOnlyHandle).isInstanceOf(ReadCollectionHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(WriteCollectionHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(ReadWriteCollectionHandle::class.java)
    }

    @Test
    fun collectionHandleAdapter_writeOnlyCantRead() = runBlockingTest {
        val writeOnlyHandle = manager.createHandle(
            HandleSpec(
                WRITE_ONLY_HANDLE,
                HandleMode.Write,
                HandleContainerType.Collection,
                Person
            ),
            STORAGE_KEY
        )

        assertThat(writeOnlyHandle).isInstanceOf(WriteCollectionHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadCollectionHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadWriteCollectionHandle::class.java)
    }

    @Test
    fun singletonHandleAdapter_onUpdateTest() = runBlockingTest {
        val handle = manager.createHandle(
            HandleSpec(
                READ_WRITE_HANDLE,
                HandleMode.ReadWrite,
                HandleContainerType.Singleton,
                Person
            ),
            STORAGE_KEY
        ) as ReadWriteSingletonHandle<Person>

        var x = 0
        handle.onUpdate { p ->
            if (p?.name == "Eliza Hamilton") {
                x++
            }
        }
        handle.store(Person("Eliza Hamilton"))
        assertThat(x).isEqualTo(1)
    }

    @Test
    fun collectionHandleAdapter_onUpdateTest() = runBlockingTest {
        val handle = manager.createHandle(
            HandleSpec(
                READ_WRITE_HANDLE,
                HandleMode.ReadWrite,
                HandleContainerType.Collection,
                Person
            ),
            STORAGE_KEY
        ) as ReadWriteCollectionHandle<Person>

        var x = 0
        handle.onUpdate { people ->
            if (people.elementAtOrNull(0)?.name == "Elder Price") {
                x += people.size
            }
        }
        handle.store(Person("Elder Price"))
        assertThat(x).isEqualTo(1)
    }

    @Test
    fun collectionHandleAdapter_createReference() = runBlocking {
        val handle = manager.createHandle(
            HandleSpec(
                READ_WRITE_HANDLE,
                HandleMode.ReadWrite,
                HandleContainerType.Collection,
                Person
            ),
            STORAGE_KEY
        ) as ReadWriteCollectionHandle<Person>
        val entity = Person("Watson")

        // Fails when there's no entityId.
        var e = assertSuspendingThrows(IllegalArgumentException::class) {
            handle.createReference(entity)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Entity must have an ID before it can be referenced."
        )

        entity.ensureEntityFields(idGenerator, READ_WRITE_HANDLE, TimeImpl())

        // Fails when the entity is not in the collection.
        e = assertSuspendingThrows(IllegalArgumentException::class) {
            handle.createReference(entity)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Entity is not stored in the Collection."
        )

        handle.store(entity)

        val reference = handle.createReference(entity)
        assertThat(reference.schemaHash).isEqualTo(Person.SCHEMA.hash)
        assertThat(reference.entityId).isEqualTo(entity.entityId)
        assertThat(reference.dereference()).isEqualTo(entity)
    }

    @Test
    fun collection_noOpsAfterClose() = runBlockingTest {
        val handle = manager.createHandle(
            HandleSpec(
                READ_WRITE_HANDLE,
                HandleMode.ReadWrite,
                HandleContainerType.Collection,
                QueryPerson
            ),
            STORAGE_KEY
        ) as ReadWriteQueryCollectionHandle<Person, Any>
        val testPerson = Person("test")
        val otherPerson = Person("other")
        handle.store(testPerson)
        handle.close()
        assertSuspendingThrows(IllegalStateException::class) { handle.store(otherPerson) }
        assertSuspendingThrows(IllegalStateException::class) { handle.remove(testPerson) }
        assertSuspendingThrows(IllegalStateException::class) { handle.clear() }
        assertSuspendingThrows(IllegalStateException::class) { handle.fetchAll() }
        assertSuspendingThrows(IllegalStateException::class) { handle.size() }
        assertSuspendingThrows(IllegalStateException::class) { handle.isEmpty() }
        assertSuspendingThrows(IllegalStateException::class) { handle.query("other") }
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
