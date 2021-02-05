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

package arcs.android.storage.service

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.crdt.ParcelableCrdtType
import arcs.android.storage.service.testing.FakeMessageCallback
import arcs.android.storage.service.testing.FakeResultCallback
import arcs.android.storage.service.testing.FakeStorageChannelCallback
import arcs.android.storage.toParcelByteArray
import arcs.core.data.CountType
import arcs.core.storage.DirectStore
import arcs.core.storage.FixedDriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.StoreOptions
import arcs.core.storage.UntypedProxyMessage
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.MockDriverProvider
import arcs.core.storage.testutil.testWriteBackProvider
import arcs.core.util.statistics.TransactionStatisticsImpl
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import java.lang.IllegalStateException
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class StorageServiceNgImplTest {
  @get:Rule
  val buildFlagsRule = BuildFlagsRule.create()

  private val driverFactory = FixedDriverFactory(MockDriverProvider())
  private val onProxyMessageCallback: suspend (StorageKey, UntypedProxyMessage) -> Unit =
    { _: StorageKey, _: UntypedProxyMessage -> }
  private val messageCallback = FakeMessageCallback()
  private val channelCallback = FakeStorageChannelCallback()

  private val scope = TestCoroutineScope()

  private lateinit var stores: ReferencedStores
  private lateinit var storageService: StorageServiceNgImpl

  @Before
  fun setUp() {
    BuildFlags.STORAGE_SERVICE_NG = true

    StorageKeyManager.GLOBAL_INSTANCE.addParser(RamDiskStorageKey)
    stores = ReferencedStores(
      { scope },
      { driverFactory },
      ::testWriteBackProvider,
      null
    )
    storageService = StorageServiceNgImpl(
      scope,
      TransactionStatisticsImpl(JvmTime),
      onProxyMessageCallback,
      stores
    )
  }

  @After
  fun tearDown() {
    scope.cleanupTestCoroutines()
  }

  @Test
  fun requiresBuildFlag() = runBlockingTest {
    BuildFlags.STORAGE_SERVICE_NG = false
    assertFailsWith<BuildFlagDisabledError> {
      StorageServiceNgImpl(
        scope,
        TransactionStatisticsImpl(JvmTime),
        onProxyMessageCallback,
        stores
      )
    }
  }

  @Test
  fun openStorageChannel_invokesOnCreateCallback_andCreatesChannel() = scope.runBlockingTest {
    val encodedStoreOptions = createEncodedStoreOptions(DUMMY_STORAGE_KEY)

    storageService.openStorageChannel(encodedStoreOptions, channelCallback, messageCallback)

    val channel = channelCallback.waitForOnCreate()

    assertThat(channel).isInstanceOf(StorageChannelImpl::class.java)
  }

  @Test
  fun openingTwoChannels_forSameStore_resultsInTwoDistinctChannels() = scope.runBlockingTest {
    val encodedStoreOptions = createEncodedStoreOptions(DUMMY_STORAGE_KEY)

    val channelCallback1 = FakeStorageChannelCallback()
    val channelCallback2 = FakeStorageChannelCallback()

    storageService.openStorageChannel(encodedStoreOptions, channelCallback1, messageCallback)
    storageService.openStorageChannel(encodedStoreOptions, channelCallback2, messageCallback)

    val channel1 = channelCallback1.waitForOnCreate() as StorageChannelImpl
    val channel2 = channelCallback2.waitForOnCreate() as StorageChannelImpl
    assertThat(channel2).isNotSameInstanceAs(channel1)
    assertThat(channel1.releasableStore.count).isEqualTo(2)
  }

  @Test
  fun openStorageChannel_createsAStore() = scope.runBlockingTest {
    val storageKey = RamDiskStorageKey("store1")
    val encodedStoreOptions = createEncodedStoreOptions(storageKey)

    storageService.openStorageChannel(encodedStoreOptions, channelCallback, messageCallback)
    channelCallback.waitForOnCreate() as StorageChannelImpl

    assertThat(stores.storageKeys()).containsExactly(storageKey)
  }

  @Test
  fun openingTwoChannels_forDifferentStores_createsTwoStores() = scope.runBlockingTest {
    // Define the store options for two different stores.
    val storageKey1 = RamDiskStorageKey("store1")
    val storageKey2 = RamDiskStorageKey("store2")
    val encodedStoreOptions1 = createEncodedStoreOptions(storageKey1)
    val encodedStoreOptions2 = createEncodedStoreOptions(storageKey2)
    val channelCallback1 = FakeStorageChannelCallback()
    val channelCallback2 = FakeStorageChannelCallback()

    // Open two storage channels for two distinct stores
    storageService.openStorageChannel(encodedStoreOptions1, channelCallback1, messageCallback)
    storageService.openStorageChannel(encodedStoreOptions2, channelCallback2, messageCallback)

    // check two stores have been created
    val channel1 = channelCallback1.waitForOnCreate() as StorageChannelImpl
    val channel2 = channelCallback2.waitForOnCreate() as StorageChannelImpl

    assertThat(stores.storageKeys()).containsExactly(storageKey1, storageKey2)

    // Check the channels are communicating with the expected stores.
    assertThat(channel1.releasableStore.store).isNotSameInstanceAs(channel2.releasableStore.store)
    assertThat(channel1.releasableStore.store.storageKey).isEqualTo(storageKey1)
    assertThat(channel2.releasableStore.store.storageKey).isEqualTo(storageKey2)
  }

  @Test
  fun openingTwoChannels_forSameStore_onlyCreatesOneStore() = scope.runBlockingTest {
    val storageKey = RamDiskStorageKey("store1")
    val encodedStoreOptions = createEncodedStoreOptions(storageKey)
    val channelCallback1 = FakeStorageChannelCallback()
    val channelCallback2 = FakeStorageChannelCallback()

    storageService.openStorageChannel(encodedStoreOptions, channelCallback1, messageCallback)
    storageService.openStorageChannel(encodedStoreOptions, channelCallback2, messageCallback)

    val channel1 = channelCallback1.waitForOnCreate() as StorageChannelImpl
    val channel2 = channelCallback2.waitForOnCreate() as StorageChannelImpl

    assertThat(stores.storageKeys()).containsExactly(storageKey)
    assertThat(channel1.releasableStore.store).isSameInstanceAs(channel2.releasableStore.store)
  }

  @Test
  fun closingAllChannels_forStore_closesStore() = scope.runBlockingTest {
    val storageKey = RamDiskStorageKey("store1")
    val encodedStoreOptions = createEncodedStoreOptions(storageKey)
    val channelCallback1 = FakeStorageChannelCallback()
    val channelCallback2 = FakeStorageChannelCallback()
    val resultCallback1 = FakeResultCallback()
    val resultCallback2 = FakeResultCallback()

    storageService.openStorageChannel(encodedStoreOptions, channelCallback1, messageCallback)
    storageService.openStorageChannel(encodedStoreOptions, channelCallback2, messageCallback)

    val channel1 = channelCallback1.waitForOnCreate() as StorageChannelImpl
    val channel2 = channelCallback2.waitForOnCreate() as StorageChannelImpl

    val store = channel1.releasableStore.store as DirectStore

    assertThat(stores.storageKeys()).containsExactly(storageKey)
    assertThat(channel1.releasableStore.count).isEqualTo(2)

    channel1.close(resultCallback1)
    resultCallback1.waitForResult()

    assertThat(stores.storageKeys()).containsExactly(storageKey)
    assertThat(channel2.releasableStore.count).isEqualTo(1)
    assertThat(store.closed).isFalse()

    channel2.close(resultCallback2)
    resultCallback2.waitForResult()

    assertThat(stores.size()).isEqualTo(0)
    assertThat(store.closed).isTrue()
  }

  @Test
  fun failsWhenClosingAClosedStore() = scope.runBlockingTest {
    val encodedStoreOptions = createEncodedStoreOptions(DUMMY_STORAGE_KEY)
    val resultCallback = FakeResultCallback()

    storageService.openStorageChannel(encodedStoreOptions, channelCallback, messageCallback)
    val channel = channelCallback.waitForOnCreate() as StorageChannelImpl
    channel.close(resultCallback)

    assertFailsWith<IllegalStateException>(
      "There is not store with storage key $DUMMY_STORAGE_KEY."
    ) {
      channel.close()
    }
  }

  @Test
  fun reconnectToAClosedStore() = scope.runBlockingTest {
    val encodedStoreOptions = createEncodedStoreOptions(DUMMY_STORAGE_KEY)
    val channelCallback1 = FakeStorageChannelCallback()
    val channelCallback2 = FakeStorageChannelCallback()
    val channelCallback3 = FakeStorageChannelCallback()
    val resultCallback1 = FakeResultCallback()
    val resultCallback2 = FakeResultCallback()
    val resultCallback3 = FakeResultCallback()

    storageService.openStorageChannel(encodedStoreOptions, channelCallback1, messageCallback)
    storageService.openStorageChannel(encodedStoreOptions, channelCallback2, messageCallback)

    val channel1 = channelCallback1.waitForOnCreate() as StorageChannelImpl
    val channel2 = channelCallback2.waitForOnCreate() as StorageChannelImpl

    val store = channel1.releasableStore.store as DirectStore

    channel1.close(resultCallback1)
    channel2.close(resultCallback2)
    resultCallback1.waitForResult()
    resultCallback2.waitForResult()

    assertThat(stores.size()).isEqualTo(0)
    assertThat(store.storageKey).isEqualTo(DUMMY_STORAGE_KEY)
    assertThat(store.closed).isTrue()

    storageService.openStorageChannel(encodedStoreOptions, channelCallback3, messageCallback)
    val channel3 = channelCallback3.waitForOnCreate() as StorageChannelImpl

    val newStore = channel3.releasableStore.store as DirectStore

    assertThat(stores.storageKeys()).containsExactly(DUMMY_STORAGE_KEY)
    assertThat(channel3.releasableStore.count).isEqualTo(1)
    assertThat(newStore.storageKey).isEqualTo(DUMMY_STORAGE_KEY)
    assertThat(newStore.closed).isFalse()

    channel3.close(resultCallback3)
    resultCallback3.waitForResult()

    assertThat(stores.size()).isEqualTo(0)
    assertThat(newStore.closed).isTrue()
  }

  private fun createEncodedStoreOptions(storageKey: StorageKey): ByteArray {
    return StoreOptions(storageKey, CountType()).toParcelByteArray(ParcelableCrdtType.Count)
  }

  companion object {
    val DUMMY_STORAGE_KEY = RamDiskStorageKey("myCount")
  }
}
