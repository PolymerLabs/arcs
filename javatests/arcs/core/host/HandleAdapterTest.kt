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

import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.jvm.util.testutil.TimeImpl
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
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

        checkThrowsWriteError { readOnlyHandle.clear() }
        checkThrowsWriteError { readOnlyHandle.store(Person()) }
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

        checkThrowsReadError { writeOnlyHandle.fetch() }
        checkThrowsReadError { writeOnlyHandle.onUpdate { } }
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

        checkThrowsWriteError { readOnlyHandle.clear() }
        checkThrowsWriteError { readOnlyHandle.store(Person()) }
        checkThrowsWriteError { readOnlyHandle.remove(Person()) }
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

        checkThrowsReadError { writeOnlyHandle.fetchAll() }
        checkThrowsReadError { writeOnlyHandle.isEmpty() }
        checkThrowsReadError { writeOnlyHandle.size() }
        checkThrowsReadError { writeOnlyHandle.onUpdate { } }
    }

    private suspend fun checkThrowsReadError(action: suspend () -> Unit) {
        val e = assertSuspendingThrows(IllegalArgumentException::class, action)
        assertThat(e).hasMessageThat().isEqualTo(
            "Handle $WRITE_ONLY_HANDLE does not support reads."
        )
    }

    private suspend fun checkThrowsWriteError(action: suspend () -> Unit) {
        val e = assertSuspendingThrows(IllegalArgumentException::class, action)
        assertThat(e).hasMessageThat().isEqualTo(
            "Handle $READ_ONLY_HANDLE does not support writes."
        )
    }

    private companion object {
        private const val READ_ONLY_HANDLE = "readOnlyHandle"
        private const val WRITE_ONLY_HANDLE = "writeOnlyHandle"

        private val STORAGE_KEY = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("backing"),
            storageKey = RamDiskStorageKey("entity")
        )
    }
}
