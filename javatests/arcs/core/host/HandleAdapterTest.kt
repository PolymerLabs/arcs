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

import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.jvm.util.testutil.TimeImpl
import arcs.sdk.combineUpdates
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

@RunWith(JUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class)
class HandleAdapterTest {
    private lateinit var manager: EntityHandleManager

    @Before
    fun setUp() {
        RamDiskDriverProvider()
        manager = EntityHandleManager(HandleManager(TimeImpl()))
    }

    @After
    fun tearDown() {
        RamDisk.clear()
    }

    @Test
    fun singletonHandleAdapter_readOnlyCantWrite() = runBlockingTest {
        val readOnlyHandle = manager.createSingletonHandle(
            HandleMode.Read,
            READ_ONLY_HANDLE,
            Person,
            STORAGE_KEY,
            Person.SCHEMA
        )

        assertThat(readOnlyHandle).isInstanceOf(ReadSingletonHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(WriteSingletonHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(ReadWriteSingletonHandle::class.java)
    }

    @Test
    fun singletonHandleAdapter_writeOnlyCantRead() = runBlockingTest {
        val writeOnlyHandle = manager.createSingletonHandle(
            HandleMode.Write,
            WRITE_ONLY_HANDLE,
            Person,
            STORAGE_KEY,
            Person.SCHEMA
        )
        assertThat(writeOnlyHandle).isInstanceOf(WriteSingletonHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadSingletonHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadWriteSingletonHandle::class.java)
    }

    @Test
    fun collectionHandleAdapter_readOnlyCantWrite() = runBlockingTest {
        val readOnlyHandle = manager.createCollectionHandle(
            HandleMode.Read,
            READ_ONLY_HANDLE,
            Person,
            STORAGE_KEY,
            Person.SCHEMA
        )

        assertThat(readOnlyHandle).isInstanceOf(ReadCollectionHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(WriteCollectionHandle::class.java)
        assertThat(readOnlyHandle).isNotInstanceOf(ReadWriteCollectionHandle::class.java)
    }

    @Test
    fun collectionHandleAdapter_writeOnlyCantRead() = runBlockingTest {
        val writeOnlyHandle = manager.createCollectionHandle(
            HandleMode.Write,
            WRITE_ONLY_HANDLE,
            Person,
            STORAGE_KEY,
            Person.SCHEMA
        )

        assertThat(writeOnlyHandle).isInstanceOf(WriteCollectionHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadCollectionHandle::class.java)
        assertThat(writeOnlyHandle).isNotInstanceOf(ReadWriteCollectionHandle::class.java)
    }

    @Test
    fun singletonHandleAdapter_onUpdateTest() = runBlockingTest {
        val handle = manager.createSingletonHandle(
            HandleMode.ReadWrite,
            READ_WRITE_HANDLE,
            Person,
            STORAGE_KEY,
            Person.SCHEMA
        ) as ReadWriteSingletonHandle<Person>

        var x = 0
        handle.onUpdate { p ->
            if(p?.name == "Eliza Hamilton") {
                x = 1
            }
        }
        handle.store(Person("Eliza Hamilton"))
        assertThat(x).isEqualTo(1)
    }

    @Test
    fun collectionHandleAdapter_onUpdateTest() = runBlockingTest {
        val handle = manager.createCollectionHandle(
            HandleMode.ReadWrite,
            READ_WRITE_HANDLE,
            Person,
            STORAGE_KEY,
            Person.SCHEMA
        ) as ReadWriteCollectionHandle<Person>

        var x = 0
        handle.onUpdate { people ->
            if(people.elementAtOrNull(0)?.name == "Elder Price") {
                x = people.size
            }
        }
        handle.store(Person("Elder Price"))
        assertThat(x).isEqualTo(1)
    }

    @Test
    fun handleAdapter_combineUpdatesTest() = runBlockingTest {
        val collection = manager.createCollectionHandle(
            HandleMode.ReadWrite,
            READ_WRITE_HANDLE,
            Person,
            STORAGE_KEY,
            Person.SCHEMA
        ) as ReadWriteCollectionHandle<Person>

        val singleton = manager.createSingletonHandle(
            HandleMode.ReadWrite,
            READ_WRITE_HANDLE,
            Person,
            KEY_TWO,
            Person.SCHEMA
        ) as ReadWriteSingletonHandle<Person>

        var x = 0
        combineUpdates(collection, singleton) { people, e2 ->
            if(people.elementAtOrNull(0)?.name == "George") {
                x = x + 1
            }
            if(e2?.name == "Martha") {
                x = x + 3
            }
        }
        collection.store(Person("George"))
        assertThat(x).isEqualTo(1)
        singleton.store(Person("Martha"))
        assertThat(x).isEqualTo(5)
    }

    private companion object {
        private const val READ_ONLY_HANDLE = "readOnlyHandle"
        private const val WRITE_ONLY_HANDLE = "writeOnlyHandle"
        private const val READ_WRITE_HANDLE = "readWriteHandle"

        private val STORAGE_KEY = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing"),
            storageKey = RamDiskStorageKey("entity")
        )

        private val KEY_TWO = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing2"),
            storageKey = RamDiskStorageKey("entity2")
        )
    }
}
