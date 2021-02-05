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

import arcs.core.data.CountType
import arcs.core.storage.DirectStore
import arcs.core.storage.FixedDriverFactory
import arcs.core.storage.StoreOptions
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.MockDriverProvider
import arcs.core.storage.testutil.testWriteBackProvider
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [ReferencedStores]. */
@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ReferencedStoresTest {

  private val driverFactory = FixedDriverFactory(MockDriverProvider())
  private val scope = TestCoroutineScope()

  @Test
  fun referencedStores_getOrPut_returnsStoreForStorageKey() = runBlockingTest {
    val referencedStores = ReferencedStores(
      { scope },
      { driverFactory },
      ::testWriteBackProvider,
      null
    )
    val storageKey1 = RamDiskStorageKey("store1")
    val storageKey2 = RamDiskStorageKey("store2")
    val storageKey3 = RamDiskStorageKey("store3")
    val store1 = referencedStores.getOrPut(StoreOptions(storageKey1, CountType())).store
    val store2 = referencedStores.getOrPut(StoreOptions(storageKey2, CountType())).store
    val store3 = referencedStores.getOrPut(StoreOptions(storageKey3, CountType())).store

    assertThat(referencedStores.size()).isEqualTo(3)
    assertThat(referencedStores.storageKeys())
      .containsExactly(storageKey1, storageKey2, storageKey3)
    assertThat(store1.storageKey).isEqualTo(storageKey1)
    assertThat(store2.storageKey).isEqualTo(storageKey2)
    assertThat(store3.storageKey).isEqualTo(storageKey3)
  }

  @Test
  fun referencedStores_getOrPut_forSameStorageKey_returnsSameInstance() = runBlockingTest {
    val referencedStores = ReferencedStores(
      { scope },
      { driverFactory },
      ::testWriteBackProvider,
      null
    )
    val releasableStore1 = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    val releasableStore2 = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))

    assertThat(releasableStore1).isNotSameInstanceAs(releasableStore2)
    assertThat(releasableStore1.store).isSameInstanceAs(releasableStore2.store)
  }

  @Test
  fun referencedStores_getOrPut_incrementsCount() = runBlockingTest {
    val referencedStores = ReferencedStores(
      { scope },
      { driverFactory },
      ::testWriteBackProvider,
      null
    )

    val releasableStore = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    val count1 = releasableStore.count
    referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    val count2 = releasableStore.count

    assertThat(count1).isEqualTo(1)
    assertThat(count2).isEqualTo(2)
  }

  @Test
  fun releasableStore_release_decrementsCount() = runBlockingTest {
    val referencedStores = ReferencedStores(
      { scope },
      { driverFactory },
      ::testWriteBackProvider,
      null
    )

    val releasableStore1 = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    val releasableStore2 = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    val releasableStore3 = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    val count1 = releasableStore1.count
    releasableStore1.release()
    val count2 = releasableStore2.count
    releasableStore2.release()
    val count3 = releasableStore3.count
    releasableStore3.release()
    val count4 = releasableStore3.count

    assertThat(count1).isEqualTo(3)
    assertThat(count2).isEqualTo(2)
    assertThat(count3).isEqualTo(1)
    assertThat(count4).isEqualTo(0)
  }

  @Test
  fun releasableStore_release_closesStore_whenCountIsZero() = runBlockingTest {
    val referencedStores = ReferencedStores(
      { scope },
      { driverFactory },
      ::testWriteBackProvider,
      null
    )
    val releasableStore1 = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    val releasableStore2 = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    val store = releasableStore1.store as DirectStore
    val isStoreClosed1 = store.closed
    releasableStore1.release()
    val isStoreClosed2 = store.closed
    releasableStore2.release()
    val isStoreClosed3 = store.closed

    assertThat(isStoreClosed1).isFalse()
    assertThat(isStoreClosed2).isFalse()
    assertThat(isStoreClosed3).isTrue()
  }

  @Test
  fun releasableStore_release_removesStoreFromReferencedStores_whenCountIsZero() = runBlockingTest {
    val referencedStores = ReferencedStores(
      { scope },
      { driverFactory },
      ::testWriteBackProvider,
      null
    )
    val releasableStore1 = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    val releasableStore2 = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    val size1 = referencedStores.size()
    releasableStore1.release()
    val size2 = referencedStores.size()
    releasableStore2.release()
    val size3 = referencedStores.size()

    assertThat(size1).isEqualTo(1)
    assertThat(size2).isEqualTo(1)
    assertThat(size3).isEqualTo(0)
  }

  @Test
  fun referencedStores_whenStoreIsRemoved_getOrPutCreatesNewStoreInstance() = runBlockingTest {
    val referencedStores = ReferencedStores(
      { scope },
      { driverFactory },
      ::testWriteBackProvider,
      null
    )
    val releasableStore = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    releasableStore.release()
    val releasableStore2 = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))

    assertThat(releasableStore.store.storageKey).isEqualTo(releasableStore2.store.storageKey)
    assertThat(releasableStore.store).isNotSameInstanceAs(releasableStore2.store)
  }

  @Test
  fun releasableStore_releaseCanOnlyBeInvokedOnce() = runBlockingTest {
    val referencedStores = ReferencedStores(
      { scope },
      { driverFactory },
      ::testWriteBackProvider,
      null
    )

    val releasableStore = referencedStores.getOrPut(StoreOptions(STORAGE_KEY, CountType()))
    releasableStore.release()

    assertFailsWith<IllegalStateException>("ReleasableStore has already been released.") {
      releasableStore.release()
    }
  }

  @Test
  fun referencedStores_supportsClearOp() = runBlockingTest {
    val referencedStores = ReferencedStores(
      { scope },
      { driverFactory },
      ::testWriteBackProvider,
      null
    )

    val storageKey1 = RamDiskStorageKey("store1")
    val storageKey2 = RamDiskStorageKey("store2")
    val storageKey3 = RamDiskStorageKey("store3")

    val store1 = referencedStores.getOrPut(
      StoreOptions(storageKey1, CountType())
    ).store as DirectStore
    val store2 = referencedStores.getOrPut(
      StoreOptions(storageKey2, CountType())
    ).store as DirectStore
    val store3 = referencedStores.getOrPut(
      StoreOptions(storageKey3, CountType())
    ).store as DirectStore

    assertThat(referencedStores.size()).isEqualTo(3)
    assertThat(store1.closed).isFalse()
    assertThat(store2.closed).isFalse()
    assertThat(store3.closed).isFalse()

    referencedStores.clear()

    assertThat(referencedStores.size()).isEqualTo(0)
    assertThat(store1.closed).isTrue()
    assertThat(store2.closed).isTrue()
    assertThat(store3.closed).isTrue()
  }

  companion object {
    private val STORAGE_KEY = RamDiskStorageKey("myCount")
  }
}
