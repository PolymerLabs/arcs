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

import arcs.core.crdt.CrdtSet
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

private typealias CollectionData = CrdtSet.Data<MockDataItem>
private typealias CollectionOp = CrdtSet.IOperation<MockDataItem>

@RunWith(JUnit4::class)
@ExperimentalCoroutinesApi
class CollectionImplTest {

    private lateinit var collection: CollectionImpl<MockDataItem>

    private val HANDLE_NAME = "HANDLE_NAME"
    private val DUMMY_VALUE1 = MockDataItem("111")
    private val DUMMY_VALUE2 = MockDataItem("222")

    @Mock private lateinit var mockStorageEndpoint:
        StorageCommunicationEndpoint<CollectionData, CollectionOp, Set<MockDataItem>>
    @Mock private lateinit var mockStorageEndpointProvider:
        StorageCommunicationEndpointProvider<CollectionData, CollectionOp, Set<MockDataItem>>

    @Before
    fun setUp() {
        MockitoAnnotations.initMocks(this)
        whenever(mockStorageEndpointProvider.getStorageEndpoint()).thenReturn(mockStorageEndpoint)
        // Obstensibly this should be a mock storageProxy, but since this unit test is primarily
        // about testing CrdtOps we want at least a reasonable fake to apply our Crdt Ops.
        val storageProxy = StorageProxy(mockStorageEndpointProvider, CrdtSet<MockDataItem>())
        val makeProxySynced =
            ProxyMessage.ModelUpdate<CollectionData, CollectionOp, Set<MockDataItem>>(
                model = CrdtSet.DataImpl(),
                id = null
            )
        runBlockingTest { storageProxy.onMessage(makeProxySynced) }
        collection = CollectionImpl(HANDLE_NAME, storageProxy)
    }

    @Test
    fun initialState() = runBlockingTest {
        assertThat(collection.name).isEqualTo(HANDLE_NAME)
        assertThat(collection.size()).isEqualTo(0)
        assertThat(collection.isEmpty()).isTrue()
        assertThat(collection.value().toList()).isEmpty()
    }

    @Test
    fun store_addsElement() = runBlockingTest {
        collection.store(DUMMY_VALUE1)

        assertThat(collection.size()).isEqualTo(1)
        assertThat(collection.isEmpty()).isFalse()
        assertThat(collection.value().toList()).containsExactly(DUMMY_VALUE1)
    }

    @Test
    fun store_canAddMultipleValues() = runBlockingTest {
        collection.store(DUMMY_VALUE1)
        collection.store(DUMMY_VALUE2)

        assertThat(collection.size()).isEqualTo(2)
        assertThat(collection.isEmpty()).isFalse()
        assertThat(collection.value().toList()).containsExactly(DUMMY_VALUE1, DUMMY_VALUE2)
    }

    @Test
    fun remove_removesSingleValue() = runBlockingTest {
        collection.store(DUMMY_VALUE1)
        collection.store(DUMMY_VALUE2)

        collection.remove(DUMMY_VALUE2)

        assertThat(collection.size()).isEqualTo(1)
        assertThat(collection.isEmpty()).isFalse()
        assertThat(collection.value().toList()).containsExactly(DUMMY_VALUE1)
    }

    @Test
    fun clear_removesMultipleValues() = runBlockingTest {
        collection.store(DUMMY_VALUE1)
        collection.store(DUMMY_VALUE2)

        collection.clear()

        assertThat(collection.size()).isEqualTo(0)
        assertThat(collection.isEmpty()).isTrue()
        assertThat(collection.value().toList()).isEmpty()
    }
}
