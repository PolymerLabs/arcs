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
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.storage.testutil.FakeDriverFactory
import arcs.core.storage.testutil.TestStoreWriteBack
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verifyZeroInteractions
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
    val writeBack = TestStoreWriteBack("protocol", this)

    // Construction of deferred store...
    DeferredStore<CrdtData, CrdtOperation, Any>(
      DUMMY_OPTIONS,
      this,
      mockDriverFactory,
      { writeBack },
      null
    )

    // ... does not construct an active store.
    verifyZeroInteractions(mockDriverFactory)
  }

  @Test
  fun deferredStore_invocation_createsActiveStore() = runBlockingTest {
    // We can confirm an active store is created if these factories / providers are invoked.
    val mockDriver = mock<Driver<Any>>()
    val fakeDriverFactory = FakeDriverFactory(mockDriver)
    val writeBack = TestStoreWriteBack("protocol", this)
    val deferredStore = DeferredStore<CrdtData, CrdtOperation, Any>(
      DUMMY_OPTIONS,
      this,
      fakeDriverFactory,
      { writeBack },
      null
    )

    // Invocation of a deferred store...
    deferredStore.invoke()

    // ... leads to the construction of an active store.
    assertThat(fakeDriverFactory.getDriverCalls).isEqualTo(1)
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
