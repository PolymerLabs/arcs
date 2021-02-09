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

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.crdt.testing.CrdtEntityHelper
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.util.toReferencable
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.FakeDriver
import arcs.core.storage.testutil.FakeDriverVendor
import arcs.core.storage.testutil.RefModeStoreHelper
import arcs.core.storage.testutil.ReferenceModeStoreTestBase
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for the [ReferenceModeStore]. */
@Suppress("UNCHECKED_CAST")
@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ReferenceModeStoreTest : ReferenceModeStoreTestBase() {

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

  @Test
  fun propagatesUpdates_fromDrivers_toProxies() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)

    val (bobCollection, bobCollectionHelper) = createCrdtSet<RawEntity>("me")
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    bobCollectionHelper.add(bob)

    val (referenceCollection, referenceCollectionHelper) = createCrdtSet<Reference>("me")
    val bobRef = bob.toReference(
      activeStore.backingStore.storageKey,
      bobCollectionHelper.versionMap
    )
    referenceCollectionHelper.add(bobRef)

    val bobCrdt = createPersonEntityCrdt()
    val actor = activeStore.crdtKey
    val bobCrdtHelper = CrdtEntityHelper(actor, bobCrdt)
    bobCrdtHelper.update("name", CrdtEntity.Reference.buildReference("bob".toReferencable()))
    bobCrdtHelper.update("age", CrdtEntity.Reference.buildReference(42.0.toReferencable()))
    bobCrdtHelper.update(
      "list",
      CrdtEntity.Reference.wrapReferencable(
        listOf(1L, 1L, 2L).map {
          it.toReferencable()
        }.toReferencable(FieldType.ListOf(FieldType.Long))
      )
    )
    bobCrdtHelper.update(
      "inline",
      CrdtEntity.Reference.wrapReferencable(
        RawEntity("", mapOf("inlineName" to "inline".toReferencable()))
      )
    )

    activeStore.backingStore
      .onProxyMessage(
        MuxedProxyMessage(
          "an-id",
          ProxyMessage.ModelUpdate(bobCrdt.data, id = activeStore.backingStoreId)
        )
      )

    val job = Job(coroutineContext[Job.Key])
    activeStore.on {
      if (it is ProxyMessage.ModelUpdate) {
        it.model.values.assertEquals(bobCollection.data.values)
        job.complete()
        return@on
      }
      job.completeExceptionally(AssertionError("Should have received model update."))
    }

    val driver = activeStore.containerStore.driver as FakeDriver<CrdtSet.Data<Reference>>
    driver.lastReceiver!!(referenceCollection.data, 1)
    job.join()
  }

  @Ignore("This test can be enabled when we output operations from collection model merges")
  @Test
  fun wontSendAnUpdate_toDriver_afterDriverOriginatedMessages() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)

    val referenceCollection = CrdtSet<Reference>()
    val reference = Reference("an-id", MockHierarchicalStorageKey(), VersionMap("me" to 1))
    referenceCollection.applyOperation(
      CrdtSet.Operation.Add("me", VersionMap("me" to 1), reference)
    )

    val driver = activeStore.containerStore.driver as FakeDriver<CrdtSet.Data<Reference>>

    driver.lastReceiver!!(referenceCollection.data, 1)

    assertThat(driver.lastData).isNull()
  }

  @Test
  fun resendsFailedDriverUpdates_afterMerging() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)

    // local model from proxy.
    val (bobCollection, bobCollectionHelper) = createCrdtSet<RawEntity>("me")
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    bobCollectionHelper.add(bob)

    // conflicting remote count from store
    val (remoteCollection, remoteCollectionHelper) = createCrdtSet<Reference>("them")
    val reference =
      Reference("another-id", MockHierarchicalStorageKey(), VersionMap("them" to 1))
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

    val driver = activeStore.containerStore.driver as FakeDriver<CrdtSet.Data<Reference>>
    driver.sendReturnValue = false // make sending return false

    activeStore.onProxyMessage(
      ProxyMessage.ModelUpdate(RefModeStoreData.Set(bobCollection.data), id = 1)
    )
    assertThat(driver.lastData).isNotNull() // send should've been called.

    driver.lastData = null
    driver.sendReturnValue = true // make sending work.

    driver.lastReceiver!!(remoteCollection.data, 1)
    assertThat(driver.lastData).isNotNull() // send should've been called again

    val actor = activeStore.crdtKey
    val ref2 = Reference("an-id", MockHierarchicalStorageKey(), VersionMap(actor to 1))
    remoteCollection.applyOperation(CrdtSet.Operation.Add("me", VersionMap("me" to 1), ref2))
    assertThat(driver.lastData).isEqualTo(remoteCollection.data)
  }

  @Test
  fun resolvesACombination_ofMessages_fromProxy_andDriver() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val storeHelper = RefModeStoreHelper("me", activeStore)

    val driver = activeStore.containerStore.driver as FakeDriver<CrdtSet.Data<Reference>>

    val e1 = createPersonEntity("e1", "e1", 1, listOf(1L), "inline1")
    val e2 = createPersonEntity("e2", "e2", 2, listOf(2L), "inline2")
    val e3 = createPersonEntity("e3", "e3", 3, listOf(3L), "inline3")
    storeHelper.sendAddOp(e1)
    storeHelper.sendAddOp(e2)
    storeHelper.sendAddOp(e3)

    val e1Ref = CrdtSet.DataValue(
      VersionMap("me" to 1),
      Reference("e1", MockHierarchicalStorageKey(), VersionMap())
    )
    val t1Ref = CrdtSet.DataValue(
      VersionMap("me" to 1, "them" to 1),
      Reference("t1", MockHierarchicalStorageKey(), VersionMap())
    )
    val t2Ref = CrdtSet.DataValue(
      VersionMap("me" to 1, "them" to 2),
      Reference("t2", MockHierarchicalStorageKey(), VersionMap())
    )

    driver.lastReceiver!!(
      CrdtSet.DataImpl(
        VersionMap("me" to 1, "them" to 1),
        mutableMapOf(
          "e1" to e1Ref,
          "t1" to t1Ref
        )
      ),
      1
    )
    driver.lastReceiver!!(
      CrdtSet.DataImpl(
        VersionMap("me" to 1, "them" to 2),
        mutableMapOf(
          "e1" to e1Ref,
          "t1" to t1Ref,
          "t2" to t2Ref
        )
      ),
      2
    )

    activeStore.idle()

    assertThat(activeStore.containerStore.getLocalData())
      .isEqualTo(driver.lastData)
  }

  // region Mocks

  private data class MockHierarchicalStorageKey(
    private val segment: String = ""
  ) : StorageKey("testing-hierarchy") {
    override fun toKeyString(): String = segment

    override fun childKeyWithComponent(component: String): StorageKey =
      MockHierarchicalStorageKey("$segment$component")
  }

  // endregion
}
