/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.android.storage.service

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SingletonType
import arcs.core.storage.Driver
import arcs.core.storage.DriverFactory
import arcs.core.storage.StoreOptions
import arcs.core.storage.WriteBack
import arcs.core.storage.testutil.DummyStorageKey
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyZeroInteractions
import com.nhaarman.mockitokotlin2.whenever
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Tests ensure that [DeferredStore] lazily creates a store.
 */
@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class DeferredStoreTest {

  @Test
  fun deferredStore_construction_doesNotCreateActiveStore() = runBlockingTest {
    // We can confirm an active store is not created if these factories / providers are not invoked.
    val mockDriverFactory = mock<DriverFactory>()
    val mockWriteBack = mock<WriteBack>()

    // Construction of deferred store...
    DeferredStore<CrdtData, CrdtOperation, Any>(
      DUMMY_OPTIONS,
      this,
      mockDriverFactory,
      { mockWriteBack },
      null
    )

    // ... does not construct an active store.
    verifyZeroInteractions(mockDriverFactory)
    verifyZeroInteractions(mockWriteBack)
  }

  @Test
  fun deferredStore_invocation_createsActiveStore() = runBlockingTest {
    // We can confirm an active store is created if these factories / providers are invoked.
    val mockDriverFactory = mock<DriverFactory>()
    val mockDriver = mock<Driver<Any>>()
    val mockWriteBack = mock<WriteBack>()
    whenever(mockDriverFactory.getDriver<Any>(any(), any())).thenReturn(mockDriver)
    val deferredStore = DeferredStore<CrdtData, CrdtOperation, Any>(
      DUMMY_OPTIONS,
      this,
      mockDriverFactory,
      { mockWriteBack },
      null
    )

    // Invocation of a deferred store...
    deferredStore.invoke()

    // ... leads to the construction of an active store.
    verify(mockDriverFactory).getDriver<Any>(any(), any())
  }

  companion object {
    val DUMMY_OPTIONS = StoreOptions(
      storageKey = DummyStorageKey("myKey"),
      type = SingletonType(
        EntityType(
          Schema(
            emptySet(),
            SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
            "someHash"
          )
        )
      )
    )
  }
}
