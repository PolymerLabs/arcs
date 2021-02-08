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

package arcs.android.storage

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.crdt.testing.CrdtEntityHelper
import arcs.core.crdt.testutil.primitiveSingletonListValue
import arcs.core.crdt.testutil.primitiveSingletonValue
import arcs.core.crdt.testutil.singletonInlineEntity
import arcs.core.crdt.testutil.singletonIsNull
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.toReferencable
import arcs.core.storage.DriverFactory
import arcs.core.storage.FixedDriverFactory
import arcs.core.storage.MuxedProxyMessage
import arcs.core.storage.ProxyMessage
import arcs.core.storage.Reference
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.driver.DatabaseDriver
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.RefModeStoreHelper
import arcs.core.storage.testutil.ReferenceModeStoreTestBase
import arcs.core.storage.testutil.getEntityDriver
import arcs.core.storage.testutil.getStoredDataForTesting
import arcs.core.storage.toReference
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("UNCHECKED_CAST")
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class ReferenceModeStoreDatabaseImplIntegrationTest : ReferenceModeStoreTestBase() {
  @get:Rule
  val logRule = LogRule()

  override val TEST_KEY = ReferenceModeStorageKey(
    DatabaseStorageKey.Persistent("entities", HASH),
    DatabaseStorageKey.Persistent("set", HASH)
  )

  override lateinit var driverFactory: DriverFactory
  private lateinit var databaseFactory: AndroidSqliteDatabaseManager

  @Before
  override fun setUp() = runBlockingTest {
    super.setUp()
    StorageKeyManager.GLOBAL_INSTANCE.reset(DatabaseStorageKey.Persistent)
    databaseFactory = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
    DatabaseDriverProvider.configure(databaseFactory, SchemaRegistry::getSchema)
    driverFactory = FixedDriverFactory(DatabaseDriverProvider)
  }

  @After
  fun tearDown() = runBlockingTest {
    databaseFactory.resetAll()
  }

  @Test
  fun propagatesModelUpdates_fromProxies_toDrivers() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)

    val (collection, collectionHelper) = createCrdtSet<RawEntity>("me")
    collectionHelper.add(createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline"))

    logRule("Sending ModelUpdate")

    activeStore.onProxyMessage(
      ProxyMessage.ModelUpdate(RefModeStoreData.Set(collection.data), 1)
    )

    activeStore.idle()

    logRule("ModelUpdate sent")

    val actor = activeStore.crdtKey
    val capturedCollection =
      activeStore.containerStore.driver.getStoredDataForTesting() as CrdtSet.DataImpl<Reference>

    assertThat(capturedCollection.values.values)
      .containsExactly(
        CrdtSet.DataValue(
          VersionMap("me" to 1),
          Reference("an-id", activeStore.backingStore.storageKey, VersionMap(actor to 1))
        )
      )

    val capturedBob = activeStore.backingStore.getEntityDriver("an-id").getStoredDataForTesting()

    assertThat(capturedBob.singletons.keys).containsExactly("name", "age", "list", "inline")
    assertThat(capturedBob.primitiveSingletonValue<String>("name")).isEqualTo("bob")
    assertThat(capturedBob.primitiveSingletonValue<Double>("age")).isEqualTo(42.0)
    assertThat(capturedBob.primitiveSingletonListValue<Long>("list"))
      .containsExactly(1L, 1L, 2L).inOrder()
    assertThat(capturedBob.singletonInlineEntity("inline")).isEqualTo(
      RawEntity("", mapOf("inlineName" to "inline".toReferencable()))
    )
    assertThat(capturedBob.collections).isEmpty()
  }

  @Test
  fun appliesAndPropagatesOperationUpdate_fromProxies_toDrivers() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val storeHelper = RefModeStoreHelper("me", activeStore)
    val actor = activeStore.crdtKey
    val (_, personCollectionHelper) = createCrdtSet<RawEntity>("me")
    val (_, referenceCollectionHelper) = createCrdtSet<Reference>("me")
    val bobEntity = createPersonEntityCrdt()
    val bobEntityHelper = CrdtEntityHelper(activeStore.crdtKey, bobEntity)

    // Apply to RefMode store.
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    storeHelper.sendAddOp(bob)

    // Apply to expected collection representation
    personCollectionHelper.add(bob)
    // Apply to expected refMode collectionStore data.
    val bobRef = Reference(
      "an-id",
      activeStore.backingStore.storageKey,
      VersionMap(actor to 1)
    )
    referenceCollectionHelper.add(bobRef)
    // Apply to expected refMode backingStore data.
    bobEntityHelper.update("name", CrdtEntity.ReferenceImpl("bob".toReferencable().id))
    bobEntityHelper.update("age", CrdtEntity.ReferenceImpl(42.0.toReferencable().id))
    bobEntityHelper.update(
      "list",
      CrdtEntity.WrappedReferencable(
        listOf(1L, 1L, 2L).map { it.toReferencable() }
          .toReferencable(FieldType.ListOf(FieldType.Long))
      )
    )
    bobEntityHelper.update(
      "inline",
      CrdtEntity.WrappedReferencable(
        RawEntity("", mapOf("inlineName" to "inline".toReferencable()))
      )
    )

    val capturedPeople =
      activeStore.containerStore.driver.getStoredDataForTesting() as CrdtSet.DataImpl<Reference>

    assertThat(capturedPeople.values.values).containsExactly(
      CrdtSet.DataValue(
        capturedPeople.versionMap,
        Reference("an-id", activeStore.backingStore.storageKey, capturedPeople.versionMap)
      )
    )
    val storedBob = activeStore.getLocalData("an-id")
    // Check that the stored bob's singleton data is equal to the expected bob's singleton data
    assertThat(storedBob.singletons).isEqualTo(bobEntity.data.singletons)
    // Check that the stored bob's collection data is equal to the expected bob's collection
    // data (empty)
    assertThat(storedBob.collections).isEqualTo(bobEntity.data.collections)
  }

  @Test
  fun removeOpClearsBackingEntity() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val actor = activeStore.crdtKey
    val storeHelper = RefModeStoreHelper(actor, activeStore)
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")

    // Add Bob to collection.
    storeHelper.sendAddOp(bob)

    // Bob was added to the backing store.
    val storedBob = activeStore.getLocalData("an-id")
    assertThat(storedBob.toRawEntity("an-id")).isEqualTo(bob)

    // Remove Bob from the collection.
    storeHelper.sendRemoveOp(bob.id)

    // Check the backing store Bob has been cleared.
    val storedBob2 = activeStore.getLocalData("an-id")
    assertThat(storedBob2.toRawEntity("an-id")).isEqualTo(createEmptyPersonEntity("an-id"))

    val capturedBob = activeStore.backingStore.getEntityDriver("an-id").getStoredDataForTesting()

    // Name and age have been cleared (their values are null).
    assertThat(capturedBob.id).isEqualTo("an-id")
    assertThat(capturedBob.singletonIsNull("name")).isTrue()
    assertThat(capturedBob.singletonIsNull("age")).isTrue()
    assertThat(capturedBob.singletonIsNull("list")).isTrue()
    assertThat(capturedBob.singletonIsNull("inline")).isTrue()
  }

  @Test
  fun singletonClearFreesBackingStoreCopy() = runBlockingTest {
    val activeStore = singletonReferenceModeStore(scope = this)
    val actor = activeStore.crdtKey
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")

    // Set singleton to Bob.
    val storeHelper = RefModeStoreHelper(actor, activeStore)
    storeHelper.sendUpdateOp(bob)
    // Bob was added to the backing store.
    assertThat(activeStore.backingStore.stores.keys).containsExactly("an-id")

    // Remove Bob from the collection.
    storeHelper.sendSingletonClearOp()

    // Check memory copy has been freed.
    assertThat(activeStore.backingStore.stores.keys).isEmpty()
  }

  @Test
  fun singletonUpdateFreesBackingStoreCopy() = runBlockingTest {
    val activeStore = singletonReferenceModeStore(scope = this)
    val actor = activeStore.crdtKey
    val storeHelper = RefModeStoreHelper(actor, activeStore)
    val alice = createPersonEntity("a-id", "alice", 41, listOf(1L, 1L, 2L), "inline")
    val bob = createPersonEntity("b-id", "bob", 42, listOf(1L, 1L, 2L), "inline")

    // Set singleton to Bob.
    storeHelper.sendUpdateOp(bob)

    // Bob was added to the backing store.
    assertThat(activeStore.backingStore.stores.keys).containsExactly("b-id")

    // Set singleton to Alice.
    storeHelper.sendUpdateOp(alice)

    // Check Bob's memory copy has been freed.
    assertThat(activeStore.backingStore.stores.keys).containsExactly("a-id")
  }

  @Test
  fun keepsEntityTimestamps() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val actor = activeStore.crdtKey
    val storeHelper = RefModeStoreHelper(actor, activeStore)
    val bob = RawEntity(
      id = "an-id",
      singletons = mapOf(
        "name" to "bob".toReferencable(),
        "age" to 42.0.toReferencable(),
        "list" to listOf(1L, 2L, 1L).map {
          it.toReferencable()
        }.toReferencable(FieldType.ListOf(FieldType.Long)),
        "inline" to RawEntity("", mapOf("inlineName" to "inline".toReferencable()))
      ),
      creationTimestamp = 10,
      expirationTimestamp = 20
    )

    // Add Bob to collection.
    storeHelper.sendAddOp(bob)

    activeStore.idle()

    // Check Bob from backing store.
    val storedBob = activeStore.getLocalData("an-id")
    assertThat(storedBob.toRawEntity()).isEqualTo(bob)
    assertThat(storedBob.toRawEntity().creationTimestamp).isEqualTo(10)
    assertThat(storedBob.toRawEntity().expirationTimestamp).isEqualTo(20)

    // Check Bob from database.
    val dbBob = activeStore.backingStore.getEntityDriver("an-id").getStoredDataForTesting()
    assertThat(dbBob.toRawEntity()).isEqualTo(bob)
    assertThat(dbBob.toRawEntity().creationTimestamp).isEqualTo(10)
    assertThat(dbBob.toRawEntity().expirationTimestamp).isEqualTo(20)
  }

  @Test
  fun respondsToAModelRequest_fromProxy_withModel() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    // Use a larger callback token so that the events we send aren't filtered from the listener we
    // attach below.
    val storeHelper = RefModeStoreHelper("me", activeStore, callbackToken = 111)

    val (entityCollection, entityCollectionHelper) = createCrdtSet<RawEntity>("me")
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    entityCollectionHelper.add(bob)

    var sentSyncRequest = false
    val job = Job(coroutineContext[Job])
    var id = -1
    id = activeStore.on {
      if (it is ProxyMessage.Operations) {
        assertThat(sentSyncRequest).isFalse()
        sentSyncRequest = true
        activeStore.onProxyMessage(ProxyMessage.SyncRequest(id))
        return@on
      }

      assertThat(sentSyncRequest).isTrue()
      if (it is ProxyMessage.ModelUpdate) {
        it.model.values.assertEquals(entityCollection.data.values)
        job.complete()
        return@on
      }
    }

    storeHelper.sendAddOp(bob)
    job.join()
  }

  @Test
  fun onlySendsModelResponse_toRequestingProxy() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)

    val job = Job(coroutineContext[Job])
    // requesting store
    val id1 = activeStore.on {
      assertThat(it is ProxyMessage.ModelUpdate).isTrue()
      job.complete()
    }

    // another store
    var calledStore2 = false
    activeStore.on {
      calledStore2 = true
    }

    activeStore.onProxyMessage(ProxyMessage.SyncRequest(id = id1))
    job.join()
    assertThat(calledStore2).isFalse()
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

    val job = Job(coroutineContext[Job])
    activeStore.on {
      if (it is ProxyMessage.ModelUpdate) {
        it.model.values.assertEquals(bobCollection.data.values)
        job.complete()
        return@on
      }
      job.completeExceptionally(AssertionError("Should have received model update."))
    }

    val driver =
      activeStore.containerStore.driver as DatabaseDriver<CrdtSet.Data<Reference>>
    driver.receiver!!(referenceCollection.data, 1)
    job.join()
  }

  @Test
  fun resolvesACombination_ofMessages_fromProxy_andDriver() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val storeHelper = RefModeStoreHelper("me", activeStore)

    val driver = activeStore.containerStore.driver as DatabaseDriver<CrdtSet.Data<Reference>>

    val e1 = createPersonEntity("e1", "e1", 1, listOf(1L, 1L, 2L), "inline")
    val e2 = createPersonEntity("e2", "e2", 2, listOf(1L, 1L, 3L), "inline2")
    val e3 = createPersonEntity("e3", "e3", 3, listOf(1L, 1L, 4L), "inline3")
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

    driver.receiver!!(
      CrdtSet.DataImpl(
        VersionMap("me" to 1, "them" to 1),
        mutableMapOf(
          "e1" to e1Ref,
          "t1" to t1Ref
        )
      ),
      3
    )
    driver.receiver!!(
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

    assertThat(activeStore.containerStore.getLocalData())
      .isEqualTo(driver.getDatabaseData().first)
  }

  @Test
  fun holdsOnto_containerUpdate_untilBackingDataArrives() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val actor = activeStore.crdtKey

    val (referenceCollection, referenceCollectionHelper) = createCrdtSet<Reference>("me")
    referenceCollectionHelper.add(
      Reference("an-id", activeStore.backingStore.storageKey, VersionMap(actor to 1))
    )

    val job = Job(coroutineContext[Job])
    var backingStoreSent = false
    val id = activeStore.on {
      if (!backingStoreSent) {
        job.completeExceptionally(
          AssertionError("Backing store data should've been sent first.")
        )
      }
      if (it is ProxyMessage.ModelUpdate) {
        val entityRecord = requireNotNull(it.model.values["an-id"]?.value)
        assertThat(entityRecord.singletons["name"]?.id)
          .isEqualTo("bob".toReferencable().id)
        val age = requireNotNull(entityRecord.singletons["age"])
        assertThat(age.unwrap()).isEqualTo(42.0.toReferencable())
        job.complete()
      } else {
        job.completeExceptionally(AssertionError("Invalid ProxyMessage type received"))
      }
    }

    val containerJob = launch {
      activeStore.containerStore.onReceive(referenceCollection.data, id + 1)
    }

    backingStoreSent = true

    val entityCrdt = createPersonEntityCrdt()
    val crdtEntityHelper = CrdtEntityHelper(actor, entityCrdt)
    crdtEntityHelper.update("name", CrdtEntity.Reference.buildReference("bob".toReferencable()))
    crdtEntityHelper.update("age", CrdtEntity.Reference.buildReference(42.0.toReferencable()))

    val backingJob = launch {
      val backingStore = activeStore.backingStore.stores.getValue("an-id")
      backingStore.store.onReceive(entityCrdt.data, id + 2)
    }

    activeStore.idle()

    job.join()
    backingJob.join()
    containerJob.join()
  }
}
