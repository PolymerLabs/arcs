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

package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.testutil.RawEntitySubject.Companion.assertThat
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.FakeDriver
import arcs.core.storage.testutil.FakeDriverVendor
import arcs.core.storage.testutil.ReferenceModeStoreTestBase
import arcs.core.storage.testutil.getStoredDataForTesting
import arcs.flags.testing.ParameterizedBuildFlags
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

/** Tests for the [ReferenceModeStore]. */
@Suppress("UNCHECKED_CAST")
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(Parameterized::class)
class ReferenceModeStoreTest(
  private val parameters: ParameterizedBuildFlags
) : ReferenceModeStoreTestBase(parameters) {

  companion object {
    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS = ParameterizedBuildFlags.of(
      "STORAGE_STRING_REDUCTION",
      "BATCH_CONTAINER_STORE_OPS",
      "REFERENCE_MODE_STORE_FIXES"
    )
  }

  override val TEST_KEY = ReferenceModeStorageKey(
    MockHierarchicalStorageKey(),
    MockHierarchicalStorageKey()
  )

  override lateinit var driverFactory: DriverFactory

  @Before
  override fun setUp() {
    super.setUp()
    driverFactory = FixedDriverFactory(FakeDriverVendor())
  }

  @Ignore("This test can be enabled when we output operations from collection model merges")
  @Test
  fun wontSendAnUpdate_toDriver_afterDriverOriginatedMessages() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)

    val referenceCollection = CrdtSet<RawReference>()
    val reference = RawReference("an-id", MockHierarchicalStorageKey(), VersionMap("me" to 1))
    referenceCollection.applyOperation(
      CrdtSet.Operation.Add("me", VersionMap("me" to 1), reference)
    )

    val driver = activeStore.containerStore.driver

    sendToReceiver(driver, referenceCollection.data, 1)

    assertThat(driver.getStoredDataForTesting()).isNull()
  }

  @Test
  fun resendsFailedDriverUpdates_afterMerging() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)

    // local model from proxy.
    val (bobCollection, bobCollectionHelper) = createCrdtSet<RawEntity>("me")
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    bobCollectionHelper.add(bob)

    // conflicting remote count from store
    val (remoteCollection, remoteCollectionHelper) = createCrdtSet<RawReference>("them")
    val reference =
      RawReference("another-id", MockHierarchicalStorageKey(), VersionMap("them" to 1))
    remoteCollectionHelper.add(reference)

    // Ensure remote entity is stored in backing store.
    activeStore.backingStore.onProxyMessage(
      MuxedProxyMessage(
        "another-id",
        ProxyMessage.ModelUpdate(
          createPersonEntityCrdt().data,
          id = activeStore.backingStoreId
        )
      )
    )

    val driver = activeStore.containerStore.driver as FakeDriver<CrdtSet.Data<RawReference>>
    driver.sendReturnValue = false // make sending return false

    activeStore.onProxyMessage(
      ProxyMessage.ModelUpdate(RefModeStoreData.Set(bobCollection.data), id = 1)
    )
    assertThat(driver.lastData).isNotNull() // send should've been called.

    driver.lastData = null
    driver.sendReturnValue = true // make sending work.

    sendToReceiver(driver as Driver<CrdtData>, remoteCollection.data, 1)
    assertThat(driver.lastData).isNotNull() // send should've been called again

    val actor = activeStore.crdtKey
    val ref2 = RawReference("an-id", MockHierarchicalStorageKey(), VersionMap(actor to 1))
    remoteCollection.applyOperation(CrdtSet.Operation.Add("me", VersionMap("me" to 1), ref2))
    assertThat(driver.lastData).isEqualTo(remoteCollection.data)
  }

  override suspend fun sendToReceiver(
    driver: Driver<CrdtData>,
    data: CrdtSet.Data<RawReference>,
    version: Int
  ) {
    val databaseDriver = driver as FakeDriver<CrdtSet.Data<RawReference>>
    val receiver = requireNotNull(databaseDriver.lastReceiver) { "Driver receiver is missing." }
    receiver(data, version)
  }

  // region Mocks

  private data class MockHierarchicalStorageKey(
    private val segment: String = ""
  ) : StorageKey(StorageKeyProtocol.Dummy) {
    override fun toKeyString(): String = segment

    override fun childKeyWithComponent(component: String): StorageKey =
      MockHierarchicalStorageKey("$segment$component")
  }

  // endregion
}
