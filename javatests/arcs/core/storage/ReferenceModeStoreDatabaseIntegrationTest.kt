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
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.crdt.testing.CrdtEntityHelper
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.toReferencable
import arcs.core.storage.driver.DatabaseDriver
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.RefModeStoreHelper
import arcs.core.storage.testutil.ReferenceModeStoreTestBase
import arcs.core.storage.testutil.getStoredDataForTesting
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("UNCHECKED_CAST")
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class ReferenceModeStoreDatabaseIntegrationTest : ReferenceModeStoreTestBase() {

  override val TEST_KEY = ReferenceModeStorageKey(
    DatabaseStorageKey.Persistent("entities", HASH),
    DatabaseStorageKey.Persistent("set", HASH)
  )
  override lateinit var driverFactory: DriverFactory
  private lateinit var databaseFactory: FakeDatabaseManager

  @Before
  override fun setUp() = runBlockingTest {
    super.setUp()
    StorageKeyManager.GLOBAL_INSTANCE.reset(DatabaseStorageKey.Persistent)
    databaseFactory = FakeDatabaseManager()
    DatabaseDriverProvider.configure(databaseFactory, SchemaRegistry::getSchema)
    driverFactory = FixedDriverFactory(DatabaseDriverProvider)
  }

  @Test
  fun databaseRoundtrip() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val storeHelper = RefModeStoreHelper("me", activeStore)

    val e1 = createPersonEntity("e1", "e1", 1, listOf(1L), "inline1")
    val e2 = createPersonEntity("e2", "e2", 2, listOf(2L), "inline2")
    storeHelper.sendAddOp(e1)
    storeHelper.sendAddOp(e2)

    // Read data (using a new store ensures we read from the db instead of using cached values).
    val activeStore2 = collectionReferenceModeStore(scope = this)
    val e1Ref = CrdtSet.DataValue(
      VersionMap("me" to 1),
      Reference("e1", activeStore2.backingStore.storageKey, VersionMap("me" to 1))
    )
    val e2Ref = CrdtSet.DataValue(
      VersionMap("me" to 2),
      Reference("e2", activeStore2.backingStore.storageKey, VersionMap("me" to 2))
    )

    assertThat(activeStore2.containerStore.getLocalData()).isEqualTo(
      CrdtSet.DataImpl(
        VersionMap("me" to 2),
        mutableMapOf(
          "e1" to e1Ref,
          "e2" to e2Ref
        )
      )
    )
    assertThat(
      activeStore2.getLocalData("e1").toRawEntity()
    ).isEqualTo(e1)
    assertThat(
      activeStore2.getLocalData("e2").toRawEntity()
    ).isEqualTo(e2)
  }

  @Test
  fun syncShouldNotIncurWrites_fromProxy_withModel() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    // Use a larger callback token so that the events we send aren't filtered from the listener we
    // attach below.
    val storeHelper = RefModeStoreHelper("me", activeStore, callbackToken = 111)

    val (_, entityCollectionHelper) = createCrdtSet<RawEntity>("me")
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    entityCollectionHelper.add(bob)

    var job = Job(coroutineContext[Job])
    var id: Int = -1
    id = activeStore.on {
      when (it) {
        is ProxyMessage.Operations ->
          activeStore.onProxyMessage(ProxyMessage.SyncRequest(id))
        is ProxyMessage.ModelUpdate ->
          job.complete()
        else -> Unit
      }
    }

    storeHelper.sendAddOp(bob)

    job.join()

    /**
     * Mainly exercise [ReferenceModeStore.constructPendingIdsAndModel] code path at the
     * duplicate [ReferenceModeStore] that handles the same [StorageKey]. The store should
     * gets its [DirectStore.onReceive] called to apply the model received from the underlying
     * driver. The assertion validates the [DirectStore.onReceive] responding to the
     * [ProxyMessage.SyncRequest] should never incur additional writes/updates sent to the
     * driver.
     */
    val activeStoreDup = collectionReferenceModeStore(scope = this)
    job = Job(coroutineContext[Job])
    val counts = databaseFactory.totalInsertUpdates()
    activeStoreDup.on {
      assertThat(databaseFactory.totalInsertUpdates()).isEqualTo(counts)
      job.complete()
    }.let {
      activeStoreDup.onProxyMessage(ProxyMessage.SyncRequest(it))
    }
    job.join()
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
          ProxyMessage.ModelUpdate(
            bobCrdt.data,
            id = activeStore.backingStoreId
          )
        )
      )

    val job = Job(coroutineContext[Job])
    activeStore.on {
      if (it is ProxyMessage.ModelUpdate) {
        it.model.values.assertEquals(bobCollection.data.values)
        job.complete()
        return@on
      }
      job.completeExceptionally(AssertionError("Should have received model update."))
    }

    sendToReceiver(activeStore.containerStore.driver, referenceCollection.data, 1)
    job.join()
  }

  @Test
  fun resolvesACombination_ofMessages_fromProxy_andDriver() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val storeHelper = RefModeStoreHelper("me", activeStore)

    val driver = activeStore.containerStore.driver

    val e1 = createPersonEntity("e1", "e1", 1, listOf(1L), "inline1")
    val e2 = createPersonEntity("e2", "e2", 2, listOf(2L), "inline2")
    val e3 = createPersonEntity("e3", "e3", 3, listOf(3L), "inline3")
    storeHelper.sendAddOp(e1)
    storeHelper.sendAddOp(e2)
    storeHelper.sendAddOp(e3)

    val e1Ref = CrdtSet.DataValue(
      VersionMap("me" to 1),
      Reference("e1", activeStore.backingStore.storageKey, VersionMap())
    )
    val t1Ref = CrdtSet.DataValue(
      VersionMap("me" to 1, "them" to 1),
      Reference("t1", activeStore.backingStore.storageKey, VersionMap("me" to 1, "them" to 1))
    )
    val t2Ref = CrdtSet.DataValue(
      VersionMap("me" to 1, "them" to 2),
      Reference("t2", activeStore.backingStore.storageKey, VersionMap("me" to 1, "them" to 2))
    )

    sendToReceiver(
      driver,
      CrdtSet.DataImpl(
        VersionMap("me" to 1, "them" to 1),
        mutableMapOf(
          "e1" to e1Ref,
          "t1" to t1Ref
        )
      ),
      3
    )
    sendToReceiver(
      driver,
      CrdtSet.DataImpl(
        VersionMap("me" to 1, "them" to 2),
        mutableMapOf(
          "e1" to e1Ref,
          "t1" to t1Ref,
          "t2" to t2Ref
        )
      ),
      4
    )

    activeStore.idle()

    assertThat(activeStore.containerStore.getLocalData()).isEqualTo(
      driver.getStoredDataForTesting()
    )
  }

  override suspend fun sendToReceiver(
    driver: Driver<CrdtData>,
    data: CrdtSet.Data<Reference>,
    version: Int
  ) {
    val databaseDriver = driver as DatabaseDriver<CrdtSet.Data<Reference>>
    val receiver = requireNotNull(databaseDriver.receiver) { "Driver receiver is missing." }
    receiver(data, version)
  }
}
