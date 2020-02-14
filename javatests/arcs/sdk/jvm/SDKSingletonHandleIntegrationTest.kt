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

import arcs.core.crdt.CrdtSingleton
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.data.SingletonType
import arcs.core.storage.DriverProvider
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageCommunicationEndpoint
import arcs.core.storage.StorageCommunicationEndpointProvider
import arcs.core.storage.StorageMode
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.handle.SingletonImpl
import arcs.core.storage.handle.SingletonProxy
import arcs.core.storage.handle.SingletonStoreOptions
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.sdk.Entity
import arcs.sdk.Particle
import arcs.sdk.SDKReadWriteSingleton
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.Mockito.verify
import org.mockito.MockitoAnnotations

@RunWith(JUnit4::class)
class SDKSingletonHandleIntegrationTest {

    private lateinit var singleton: SDKReadWriteSingleton<DummyEntity>
    @Mock private lateinit var particle: Particle
    @Mock private lateinit var action: (DummyEntity?) -> Unit

    private val HANDLE_NAME = "HANDLE_NAME"

    private val testValue = DummyEntity("111")

    @Before
    fun setUp() {
        RamDiskDriverProvider()
        RamDisk.clear()
        MockitoAnnotations.initMocks(this)
        val storageKey = ReferenceModeStorageKey(
            backingKey = RamDiskStorageKey("back"),
            storageKey = RamDiskStorageKey("coll")
        )
        val store = Store(SingletonStoreOptions<RawEntity>(
            storageKey = storageKey,
            existenceCriteria = ExistenceCriteria.MayExist,
            type = SingletonType(EntityType(DummyEntity.schema)),
            mode = StorageMode.ReferenceMode
        ))

        runBlocking {
            val storageProxy = SingletonProxy(store.activate(), CrdtSingleton())
            val storageHandle = SingletonImpl(HANDLE_NAME, storageProxy)
            storageProxy.registerHandle(storageHandle)
            singleton = SDKReadWriteSingleton(HANDLE_NAME, particle, storageHandle, DummyEntity.Spec())
            singleton.onUpdate(action)
        }
    }

    @Test
    fun initialState() {
        assertThat(singleton.name).isEqualTo(HANDLE_NAME)
        assertThat(singleton.fetch()).isNull()
    }

    @Test
    fun set_changesValue() {
        singleton.set(testValue)
        assertThat(singleton.fetch()).isEqualTo(testValue)
    }

    @Test
    fun set_updatesParticle() {
        singleton.set(testValue)
        verify(particle).onHandleUpdate(singleton)
    }

    @Test
    fun clear_changesValue() {
        singleton.set(testValue)
        singleton.clear()
        assertThat(singleton.fetch()).isNull()
    }

    @Test
    fun clear_updatesParticle() {
        singleton.clear()
        verify(particle).onHandleUpdate(singleton)
    }

    @Test
    fun set_updatesHandle() {
        singleton.set(testValue)
        verify(action).invoke(testValue)
    }

    @Test
    fun clear_updatesHandle() {
        singleton.clear()
        verify(action).invoke(null)
    }
}
