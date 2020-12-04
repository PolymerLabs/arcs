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
import arcs.android.storage.service.testing.FakeStorageChannelCallback
import arcs.android.storage.toParcelByteArray
import arcs.core.data.CountType
import arcs.core.storage.FixedDriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.StoreOptions
import arcs.core.storage.UntypedProxyMessage
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.MockDriverProvider
import arcs.core.storage.testutil.testWriteBackProvider
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import com.google.common.truth.Truth.assertThat
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
  val buildFlagsRule = BuildFlagsRule()

  private val driverFactory = FixedDriverFactory(MockDriverProvider())
  private val onProxyMessageCallback: suspend (StorageKey, UntypedProxyMessage) -> Unit =
    { _: StorageKey, _: UntypedProxyMessage -> }
  private val messageCallback = FakeMessageCallback()
  private val channelCallback = FakeStorageChannelCallback()

  private val scope = TestCoroutineScope()
  private lateinit var storageService: StorageServiceNgImpl

  @Before
  fun setUp() {
    BuildFlags.STORAGE_SERVICE_NG = true

    StorageKeyParser.addParser(RamDiskStorageKey)
    storageService = StorageServiceNgImpl(
      scope,
      driverFactory,
      ::testWriteBackProvider,
      null,
      onProxyMessageCallback
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
        driverFactory,
        ::testWriteBackProvider,
        null,
        onProxyMessageCallback
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

    val channel1 = channelCallback1.waitForOnCreate()
    val channel2 = channelCallback2.waitForOnCreate()
    assertThat(channel2).isNotSameInstanceAs(channel1)
  }

  @Test
  fun openStorageChannel_createsAStore() = scope.runBlockingTest {
    val storageKey = RamDiskStorageKey("store1")
    val encodedStoreOptions = createEncodedStoreOptions(storageKey)

    storageService.openStorageChannel(encodedStoreOptions, channelCallback, messageCallback)
    channelCallback.waitForOnCreate() as StorageChannelImpl

    assertThat(storageService.activeStorageKeys).containsExactly(storageKey)
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

    assertThat(storageService.activeStorageKeys).containsExactly(storageKey1, storageKey2)

    // Check the channels are communicating with the expected stores.
    assertThat(channel1.store).isNotSameInstanceAs(channel2.store)
    assertThat(channel1.store.storageKey).isEqualTo(storageKey1)
    assertThat(channel2.store.storageKey).isEqualTo(storageKey2)
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

    assertThat(storageService.activeStorageKeys).containsExactly(storageKey)
    assertThat(channel1.store).isSameInstanceAs(channel2.store)
  }

  private fun createEncodedStoreOptions(storageKey: StorageKey): ByteArray {
    return StoreOptions(storageKey, CountType()).toParcelByteArray(ParcelableCrdtType.Count)
  }

  companion object {
    val DUMMY_STORAGE_KEY = RamDiskStorageKey("myCount")
  }
}
