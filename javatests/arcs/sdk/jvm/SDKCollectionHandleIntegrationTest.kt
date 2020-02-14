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

package arcs.sdk.jvm

import arcs.core.crdt.CrdtSet
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.StorageMode
import arcs.core.storage.Store
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.handle.CollectionImpl
import arcs.core.storage.handle.SetProxy
import arcs.core.storage.handle.SetStoreOptions
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.sdk.Particle
import arcs.sdk.SDKReadWriteCollection
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.MockitoAnnotations

@RunWith(JUnit4::class)
class SDKCollectionHandleIntegrationTest {

    private lateinit var collection: SDKReadWriteCollection<DummyEntity>
    @Mock private lateinit var particle: Particle

    private val HANDLE_NAME = "HANDLE_NAME"
    private val DUMMY_VALUE1 = DummyEntity("111")
    private val DUMMY_VALUE2 = DummyEntity("222")
    @Mock private lateinit var action: (Set<DummyEntity>) -> Unit

    @Before
    fun setUp() {
        RamDiskDriverProvider()
        RamDisk.clear()
        MockitoAnnotations.initMocks(this)
        val storageKey = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("back"),
            storageKey = RamDiskStorageKey("coll")
        )
        val store = Store(SetStoreOptions<RawEntity>(
            storageKey = storageKey,
            existenceCriteria = ExistenceCriteria.MayExist,
            type = CollectionType(EntityType(DummyEntity.schema)),
            mode = StorageMode.ReferenceMode
        ))

        runBlocking {
            val storageProxy = SetProxy(store.activate(), CrdtSet())
            val storageHandle = CollectionImpl(HANDLE_NAME, storageProxy)
            storageProxy.registerHandle(storageHandle)
            collection = SDKReadWriteCollection(HANDLE_NAME, particle, storageHandle, DummyEntity.Spec())
            collection.onUpdate(action)
        }
    }

    @Test
    fun initialState() {
        assertThat(collection.name).isEqualTo(HANDLE_NAME)
        assertThat(collection.size).isEqualTo(0)
        assertThat(collection.isEmpty()).isTrue()
        assertThat(collection.fetchAll()).isEmpty()
    }

    @Test
    fun store_addsElement() {
        collection.store(DUMMY_VALUE1)

        assertThat(collection.size).isEqualTo(1)
        assertThat(collection.isEmpty()).isFalse()
        assertThat(collection.fetchAll()).containsExactly(DUMMY_VALUE1)
    }

    @Test
    fun store_canAddMultipleValues() {
        collection.store(DUMMY_VALUE1)
        collection.store(DUMMY_VALUE2)

        assertThat(collection.size).isEqualTo(2)
        assertThat(collection.isEmpty()).isFalse()
        assertThat(collection.fetchAll()).containsExactly(DUMMY_VALUE1, DUMMY_VALUE2)
    }

    @Test
    fun store_updatesParticle() {
        collection.store(DUMMY_VALUE1)
        verify(particle).onHandleUpdate(collection)
    }

    @Test
    fun remove_removesSingleValue() {
        collection.store(DUMMY_VALUE1)
        collection.store(DUMMY_VALUE2)

        collection.remove(DUMMY_VALUE2)

        assertThat(collection.size).isEqualTo(1)
        assertThat(collection.isEmpty()).isFalse()
        assertThat(collection.fetchAll()).containsExactly(DUMMY_VALUE1)
    }

    @Test
    fun remove_updatesParticle() {
        collection.store(DUMMY_VALUE1)
        collection.store(DUMMY_VALUE2)
        collection.remove(DUMMY_VALUE2)
        verify(particle, times(3)).onHandleUpdate(collection)
    }

    @Test
    fun clear_removesMultipleValues() {
        collection.store(DUMMY_VALUE1)
        collection.store(DUMMY_VALUE2)

        collection.clear()

        assertThat(collection.size).isEqualTo(0)
        assertThat(collection.isEmpty()).isTrue()
        assertThat(collection.fetchAll()).isEmpty()
    }

    @Test
    fun clear_updatesParticle() {
        collection.store(DUMMY_VALUE1)
        collection.store(DUMMY_VALUE2)
        collection.clear()
        // Expect 4 times: 2 stores and 2 removes
        verify(particle, times(4)).onHandleUpdate(collection)
    }

    @Test
    fun test_onUpdates() {
        val s: Set<DummyEntity> = setOf()
        /*
        collection.clear()
        verify(action).invoke(s)
         */

        collection.store(DUMMY_VALUE1)
        val s2: Set<DummyEntity> = setOf(DUMMY_VALUE1)
        verify(action).invoke(s2)

        collection.remove(DUMMY_VALUE1)
        verify(action, times(1)).invoke(s)
    }

}
