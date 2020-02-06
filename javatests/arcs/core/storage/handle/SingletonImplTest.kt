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

package arcs.core.storage.handle

import arcs.core.crdt.CrdtSingleton
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageCommunicationEndpoint
import arcs.core.storage.StorageCommunicationEndpointProvider
import arcs.core.storage.StorageProxy
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.whenever
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.MockitoAnnotations

private typealias SingletonData = CrdtSingleton.Data<MockDataItem>
private typealias SingletonOp = CrdtSingleton.IOperation<MockDataItem>

@RunWith(JUnit4::class)
@ExperimentalCoroutinesApi
class SingletonImplTest {

    private lateinit var singleton: SingletonImpl<MockDataItem>

    private val HANDLE_NAME = "HANDLE_NAME"
    private val DUMMY_VALUE = MockDataItem("123")

    @Mock
    private lateinit var mockStorageEndpoint:
        StorageCommunicationEndpoint<SingletonData, SingletonOp, MockDataItem?>
    @Mock
    private lateinit var mockStorageEndpointProvider:
        StorageCommunicationEndpointProvider<SingletonData, SingletonOp, MockDataItem?>

    @Before
    fun setUp() {
        MockitoAnnotations.initMocks(this)
        whenever(mockStorageEndpointProvider.getStorageEndpoint()).thenReturn(mockStorageEndpoint)

        // Obstensibly this should be a mock storageProxy, but since this unit test is primarily
        // about testing CrdtOps we want at least a reasonable fake to apply our Crdt Ops.
        val storageProxy = StorageProxy(mockStorageEndpointProvider, CrdtSingleton<MockDataItem>())
        val syncMsg = ProxyMessage.ModelUpdate<SingletonData, SingletonOp, MockDataItem?>(
            model = CrdtSingleton.DataImpl(),
            id = null
        )
        runBlockingTest { storageProxy.onMessage(syncMsg) }
        singleton = SingletonImpl(HANDLE_NAME, storageProxy)
    }

    @Test
    fun initialState() = runBlockingTest {
        assertThat(singleton.name).isEqualTo(HANDLE_NAME)
        assertThat(singleton.get()).isNull()
    }

    @Test
    fun set_changesValue() = runBlockingTest {
        singleton.set(DUMMY_VALUE)
        assertThat(singleton.get()).isEqualTo(DUMMY_VALUE)
    }

    @Test
    fun clear_changesValue() = runBlockingTest {
        singleton.set(DUMMY_VALUE)
        singleton.clear()
        assertThat(singleton.get()).isNull()
    }
}
