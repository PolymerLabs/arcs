package arcs.core.storage.testutil

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.crdt.testing.CrdtEntityHelper
import arcs.core.crdt.testing.CrdtSetHelper
import arcs.core.crdt.testutil.primitiveSingletonListValue
import arcs.core.crdt.testutil.primitiveSingletonValue
import arcs.core.crdt.testutil.singletonInlineEntity
import arcs.core.crdt.testutil.singletonIsNull
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.toReferencable
import arcs.core.storage.Driver
import arcs.core.storage.DriverFactory
import arcs.core.storage.FixedDriverFactory
import arcs.core.storage.MuxedProxyMessage
import arcs.core.storage.ProxyMessage
import arcs.core.storage.RawReference
import arcs.core.storage.ReferenceModeStore
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.RefModeStoreOutput
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.toReference
import arcs.core.util.testutil.LogRule
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

/**
 * Testing base class for [ReferenceModeStore] tests. Subclasses can override this class to run its
 * suite of tests for its own database backend.
 */
@RunWith(Parameterized::class)
@OptIn(ExperimentalCoroutinesApi::class)
abstract class ReferenceModeStoreTestBase(private val parameters: ParameterizedBuildFlags) {
  // TODO(b/171729186): Move all tests that are shared between ReferenceModeStoreTest,
  // ReferenceModeStoreDatabaseIntegrationTest and ReferenceModeStoreDatabaseImplIntegrationTest
  // here.

  @get:Rule
  val logRule = LogRule()

  @get:Rule val rule = BuildFlagsRule.parameterized(parameters)

  protected abstract val TEST_KEY: ReferenceModeStorageKey

  protected abstract var driverFactory: DriverFactory

  /** Method implemented by subclasses, to send data to a [Driver]'s receiver. */
  protected abstract suspend fun sendToReceiver(
    driver: Driver<CrdtData>,
    data: CrdtSet.Data<RawReference>,
    version: Int
  )

  protected val HASH = "abcd9876"

  protected val INLINE_HASH = "INLINE_HASH"
  protected val INLINE_SCHEMA = Schema(
    setOf(SchemaName("Inline")),
    SchemaFields(
      singletons = mapOf(
        "inlineName" to FieldType.Text
      ),
      collections = emptyMap()
    ),
    INLINE_HASH
  )

  protected val SCHEMA = Schema(
    setOf(SchemaName("person")),
    SchemaFields(
      singletons = mapOf(
        "name" to FieldType.Text,
        "age" to FieldType.Number,
        "list" to FieldType.ListOf(FieldType.Long),
        "inline" to FieldType.InlineEntity(INLINE_HASH)
      ),
      collections = emptyMap()
    ),
    HASH
  )

  open fun setUp() {
    SchemaRegistry.register(SCHEMA)
    SchemaRegistry.register(INLINE_SCHEMA)
  }

  @Test
  fun driverMissing_throws() = runBlockingTest {
    driverFactory = FixedDriverFactory()
    assertFailsWith<CrdtException> { collectionReferenceModeStore(scope = this) }
  }

  @Test
  fun constructsReferenceModeStore() = runBlockingTest {
    val store = collectionReferenceModeStore(scope = this)

    assertThat(store).isInstanceOf(ReferenceModeStore::class.java)
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
      activeStore.containerStore.driver.getStoredDataForTesting() as CrdtSet.DataImpl<RawReference>

    assertThat(capturedCollection.values.values)
      .containsExactly(
        CrdtSet.DataValue(
          VersionMap("me" to 1),
          RawReference("an-id", activeStore.backingStore.storageKey, VersionMap(actor to 1))
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
    val (_, referenceCollectionHelper) = createCrdtSet<RawReference>("me")
    val bobEntity = createPersonEntityCrdt()
    val bobEntityHelper = CrdtEntityHelper(activeStore.crdtKey, bobEntity)

    // Apply to RefMode store.
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    storeHelper.sendAddOp(bob)

    // Apply to expected collection representation
    personCollectionHelper.add(bob)
    // Apply to expected refMode collectionStore data.
    val bobRef = RawReference(
      "an-id",
      activeStore.backingStore.storageKey,
      VersionMap(actor to 1)
    )
    referenceCollectionHelper.add(bobRef)

    fun updateBob() {
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
    }

    // Apply to expected refMode backingStore data.
    updateBob()

    // TODO(b/175505629): Will not need to update the fields twice once the "version too big" bug
    //  has been fixed.
    // As part of the change to fix b/176930336, itemVersionGetter obtains the versionMap that will
    // be used to create the reference. ItemVersionGetter results in the "version too big" bug.
    if (BuildFlags.REFERENCE_MODE_STORE_FIXES) {
      updateBob()
    }

    val capturedPeople =
      activeStore.containerStore.driver.getStoredDataForTesting() as CrdtSet.DataImpl<RawReference>

    val referenceVersionMap = if (BuildFlags.REFERENCE_MODE_STORE_FIXES)
      VersionMap(activeStore.crdtKey to 1)
    else
      capturedPeople.versionMap

    assertThat(capturedPeople.values.values).containsExactly(
      CrdtSet.DataValue(
        capturedPeople.versionMap,
        RawReference("an-id", activeStore.backingStore.storageKey, referenceVersionMap)
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
  fun propagatesUpdates_fromDrivers_toProxies() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)

    val (bobCollection, bobCollectionHelper) = createCrdtSet<RawEntity>("me")
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    bobCollectionHelper.add(bob)

    val (referenceCollection, referenceCollectionHelper) = createCrdtSet<RawReference>("me")
    val versionMap = if (BuildFlags.REFERENCE_MODE_STORE_FIXES) {
      VersionMap(activeStore.crdtKey to 1)
    } else {
      bobCollectionHelper.versionMap
    }
    val bobRef = bob.toReference(
      activeStore.backingStore.storageKey,
      versionMap
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
        assertThat(it.model.values).containsExactlyEntriesIn(bobCollection.data.values)
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

    val e1 = createPersonEntity("e1", "e1", 1, listOf(1L, 1L, 2L), "inline")
    val e2 = createPersonEntity("e2", "e2", 2, listOf(1L, 1L, 3L), "inline2")
    val e3 = createPersonEntity("e3", "e3", 3, listOf(1L, 1L, 4L), "inline3")
    storeHelper.sendAddOp(e1)
    storeHelper.sendAddOp(e2)
    storeHelper.sendAddOp(e3)

    val e1Ref = CrdtSet.DataValue(
      VersionMap("me" to 1),
      RawReference("e1", activeStore.backingStore.storageKey, VersionMap())
    )
    val t1Ref = CrdtSet.DataValue(
      VersionMap("me" to 1, "them" to 1),
      RawReference("t1", activeStore.backingStore.storageKey, VersionMap("me" to 1, "them" to 1))
    )
    val t2Ref = CrdtSet.DataValue(
      VersionMap("me" to 1, "them" to 2),
      RawReference("t2", activeStore.backingStore.storageKey, VersionMap("me" to 1, "them" to 2))
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

    assertThat(activeStore.containerStore.getLocalData())
      .isEqualTo(driver.getStoredDataForTesting())
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
  fun clearOpClearsBackingEntities() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val actor = activeStore.crdtKey
    val storeHelper = RefModeStoreHelper(actor, activeStore)

    // Add a couple of people.
    val alice = createPersonEntity("id1", "alice", 10, listOf(10L, 10L), "inline1")
    storeHelper.sendAddOp(alice)
    val bob = createPersonEntity("id2", "bob", 20, listOf(20L, 20L), "inline2")
    storeHelper.sendAddOp(bob)

    // Verify that they've been stored.
    val storedRefs = activeStore.containerStore.getLocalData() as CrdtSet.Data<RawReference>
    assertThat(storedRefs.values.keys).containsExactly("id1", "id2")

    val storedAlice = activeStore.getLocalData("id1")
    assertThat(storedAlice.toRawEntity("id1")).isEqualTo(alice)

    val storedBob = activeStore.getLocalData("id2")
    assertThat(storedBob.toRawEntity("id2")).isEqualTo(bob)

    // Clear!
    storeHelper.sendCollectionClearOp()

    val clearedRefs = activeStore.containerStore.getLocalData() as CrdtSet.Data<RawReference>
    assertThat(clearedRefs.values.keys).isEmpty()

    val clearedAlice = activeStore.getLocalData("id1")
    assertThat(clearedAlice.toRawEntity("id1")).isEqualTo(createEmptyPersonEntity("id1"))

    val clearedBob = activeStore.getLocalData("id2")
    assertThat(clearedBob.toRawEntity("id2")).isEqualTo(createEmptyPersonEntity("id2"))
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
        assertThat(it.model.values).containsExactlyEntriesIn(entityCollection.data.values)
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
  fun holdsOnto_containerUpdate_untilBackingDataArrives() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val actor = activeStore.crdtKey

    val (referenceCollection, referenceCollectionHelper) = createCrdtSet<RawReference>("me")
    referenceCollectionHelper.add(
      RawReference("an-id", activeStore.backingStore.storageKey, VersionMap(actor to 1))
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

  @Test
  fun backingStoresCleanedUpWhenLastCallbackRemoved() = runBlockingTest {
    val store = collectionReferenceModeStore(scope = this)

    val token = store.on {}

    val (collection, collectionHelper) = createCrdtSet<RawEntity>("me")
    val entity = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    collectionHelper.add(entity)

    store.onProxyMessage(
      ProxyMessage.ModelUpdate(RefModeStoreData.Set(collection.data), 1)
    )

    store.off(token)
    store.idle()
    assertThat(store.backingStore.stores.size).isEqualTo(0)
  }

  @Test
  fun backingStoresCleanedUpWhenLastCallbackRemovedTwice() = runBlockingTest {
    val store = collectionReferenceModeStore(scope = this)

    val preToken = store.on {}
    store.off(preToken)

    val token = store.on {}
    val (collection, collectionHelper) = createCrdtSet<RawEntity>("me")
    val entity = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    collectionHelper.add(entity)

    store.onProxyMessage(
      ProxyMessage.ModelUpdate(RefModeStoreData.Set(collection.data), 1)
    )
    store.idle()
    assertThat(store.backingStore.stores.size).isEqualTo(1)

    store.off(token)
    store.idle()
    assertThat(store.backingStore.stores.size).isEqualTo(0)

    val token2 = store.on {}
    store.onProxyMessage(
      ProxyMessage.ModelUpdate(RefModeStoreData.Set(collection.data), 1)
    )
    store.idle()
    assertThat(store.backingStore.stores.size).isEqualTo(1)

    store.off(token2)
    store.idle()
    assertThat(store.backingStore.stores.size).isEqualTo(0)
  }

  @Test
  fun close_closesBackingAndContainerStores() = runBlockingTest {
    val activeStore = singletonReferenceModeStore(scope = this)
    val storeHelper = RefModeStoreHelper("me", activeStore)

    // Set singleton to Bob.
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    storeHelper.sendUpdateOp(bob)

    assertThat(activeStore.containerStore.closed).isFalse()
    assertThat(activeStore.backingStore.stores).hasSize(1)
    assertThat(activeStore.backingStore.stores.values.single().store.closed).isFalse()

    activeStore.close()

    assertThat(activeStore.containerStore.closed).isTrue()
    assertThat(activeStore.backingStore.stores).isEmpty()
  }

  @Test
  fun backingStoresCleanedUpWhenLastCallbackRemovedRaces() = runBlockingTest {
    val store = collectionReferenceModeStore(scope = this)

    val callbackJob = launch {
      for (i in 0..100) {
        val preToken = store.on {}
        delay(1)
        store.off(preToken)
      }
    }

    val dataJob = launch {
      for (i in 0..100) {
        val (collection, collectionHelper) = createCrdtSet<RawEntity>("me")
        val entity = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
        collectionHelper.add(entity)

        store.onProxyMessage(
          ProxyMessage.ModelUpdate(RefModeStoreData.Set(collection.data), 1)
        )
      }
    }

    callbackJob.join()
    dataJob.join()

    store.idle()
    assertThat(store.backingStore.stores.size).isEqualTo(0)
  }

  @Test
  fun syncRequest_fromProxy_withPendingIds_becauseOfMissingBackingData() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)

    val actor = "me"
    val (collection, collectionHelper) = createCrdtSet<RawEntity>(actor)
    val bobEntity = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    collectionHelper.add(bobEntity)

    // Data that will be stored in backing store.
    // TODO(b/175505629): fix initialVersion once "version too big" bug has been fixed.
    val bobCrdt = CrdtEntity.newAtVersionForTest(
      VersionMap(activeStore.crdtKey to 2),
      bobEntity
    )

    // Data that will be stored in container store.
    val (refCollection, refCollectionHelper) = createCrdtSet<RawReference>(actor)
    val bobReference = bobEntity.toReference(
      activeStore.backingStore.storageKey,
      VersionMap(activeStore.crdtKey to 1)
    )
    refCollectionHelper.add(bobReference)

    // Update the container store first.
    activeStore.containerStore.onProxyMessage(
      ProxyMessage.ModelUpdate(
        refCollection.data,
        id = 1
      )
    )

    // Set up proxy.
    val deferredData = CompletableDeferred<RefModeStoreData>()
    val id = activeStore.on {
      if (it is ProxyMessage.ModelUpdate) {
        deferredData.complete(it.model)
        return@on
      }
    }

    // Send sync request.
    activeStore.onProxyMessage(ProxyMessage.SyncRequest(id))

    // Update backing store.
    val backingDirectStore = activeStore.backingStore.getStore(
      "an-id",
      activeStore.backingStoreId
    ).store
    backingDirectStore.onReceive(bobCrdt.data, activeStore.backingStoreId + 1)

    val data = deferredData.await()
    assertThat(data.values).containsExactlyEntriesIn(collection.data.values)
  }

  @Test
  fun syncRequest_fromProxy_withPendingIds_becauseOfOldBackingData() = runBlockingTest {
    // In this test there are two entities stored in the backing store (alice and bob).
    // When an entity is stored in the backing store, we expect the reference version to be `n` and
    // the crdt version to be `n + 1`. This is because when an entity is first stored, it has an
    // initial reference version of 1 and an initial crdt version of 2 (refer to "version too big"
    // bug b/175505629). When the entity updates, then both the reference version and the crdt
    // version will increment by 1.
    //
    // In this test, the bob entity has a reference version of 1 and a crdt version of 2 which
    // follows the rule described above; however, the alice entity has a reference version of 2 and
    // a crdt version of 2. This does not follow the rule, indicating that the crdt data stored in
    // the backing store is old. When the reference mode store receives a sync request, it
    // recognises that the backing store data for alice is old and therefore the corresponding
    // reference is a pending id. It waits for the pending id to be resolved before responding to
    // the sync request.
    val activeStore = collectionReferenceModeStore(scope = this)
    val actor = "me"
    val (collection, collectionHelper) = createCrdtSet<RawEntity>(actor)
    val bobEntity = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    val aliceEntity = createPersonEntity("id1", "alice", 10, listOf(10L, 10L), "inline")
    collectionHelper.add(bobEntity)
    collectionHelper.add(aliceEntity)

    // Data stored in backing store. bobCrdt is up to date but aliceCrdt represents old backing
    // data (because it has the same version of the reference).
    // TODO(b/175505629): fix initialVersion once "version too big" bug has been fixed.
    val bobCrdt = CrdtEntity.newAtVersionForTest(
      VersionMap(activeStore.crdtKey to 2),
      bobEntity
    )
    val aliceCrdt = CrdtEntity.newAtVersionForTest(
      VersionMap(activeStore.crdtKey to 2),
      aliceEntity
    )

    // Send data to backing store.
    val bobBackingStore = activeStore.backingStore.getStore(
      "an-id",
      activeStore.backingStoreId
    ).store
    bobBackingStore.onReceive(bobCrdt.data, activeStore.backingStoreId + 1)
    val aliceBackingStore = activeStore.backingStore.getStore(
      "id1",
      activeStore.backingStoreId
    ).store
    aliceBackingStore.onReceive(aliceCrdt.data, activeStore.backingStoreId + 1)

    // Data stored in container store. Both bobReference and aliceReference are the most up to date
    // data. bobCrdt is recent enough for bobReference to be satisfied (backing version = reference
    // version + 1), but aliceCrdt is not (backing version == reference version). This means
    // aliceReference is a pending id.
    val refCollection = CrdtSet<RawReference>()
    val bobReference = bobEntity.toReference(
      activeStore.backingStore.storageKey,
      VersionMap(
        activeStore.crdtKey to 1
      )
    )
    val aliceReference = aliceEntity.toReference(
      activeStore.backingStore.storageKey,
      VersionMap(
        activeStore.crdtKey to 2
      )
    )

    // Send data to container store.
    refCollection.applyOperation(
      CrdtSet.Operation.Add(actor, VersionMap(actor to 1), bobReference)
    )
    refCollection.applyOperation(
      CrdtSet.Operation.Add(
        actor,
        VersionMap(actor to 2),
        aliceReference
      )
    )
    activeStore.containerStore.onProxyMessage(
      ProxyMessage.ModelUpdate(
        refCollection.data,
        id = 1
      )
    )

    activeStore.idle()

    // Set up proxy.
    val deferredData = CompletableDeferred<RefModeStoreData>()
    val id = activeStore.on {
      if (it is ProxyMessage.ModelUpdate) {
        deferredData.complete(it.model)
        return@on
      }
    }

    // Send sync request.
    activeStore.onProxyMessage(ProxyMessage.SyncRequest(id))

    // Update backing store to update aliceCrdt. This resolves the aliceReference pending id.
    // TODO(b/175505629): fix initialVersion once "version too big" bug has been fixed.
    val updatedAliceCrdt = CrdtEntity.newAtVersionForTest(
      VersionMap(activeStore.crdtKey to 3),
      aliceEntity
    )
    aliceBackingStore.onReceive(updatedAliceCrdt.data, activeStore.backingStoreId + 1)

    val data = deferredData.await()
    assertThat(data.values).containsExactlyEntriesIn(collection.data.values)
  }

  @Test
  fun syncRequest_withMissingBackingStoreData_clearsContainerStore() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)

    val actor = "me"
    val bobEntity = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")

    // Data that will be stored in container store.
    val (refCollection, refCollectionHelper) = createCrdtSet<RawReference>(actor)
    val bobReference = bobEntity.toReference(
      activeStore.backingStore.storageKey,
      VersionMap(actor to 1)
    )
    refCollectionHelper.add(bobReference)

    // Update the container store first.
    activeStore.containerStore.onProxyMessage(
      ProxyMessage.ModelUpdate(
        refCollection.data,
        id = 1
      )
    )

    // Set up proxy.
    val deferredData = CompletableDeferred<RefModeStoreData>()
    val deferredContainerData = CompletableDeferred<CrdtSet.Data<RawReference>>()
    val id = activeStore.on {
      if (it is ProxyMessage.ModelUpdate) {
        deferredData.complete(it.model)
        @Suppress("UNCHECKED_CAST")
        deferredContainerData.complete(
          activeStore.containerStore.getLocalData() as CrdtSet.Data<RawReference>
        )
        return@on
      }
    }

    // Send sync request.
    activeStore.onProxyMessage(ProxyMessage.SyncRequest(id))

    val data = deferredData.await()
    val containerData = deferredContainerData.await()
    assertThat(data.values).isEmpty()
    assertThat(containerData.values).isEmpty()
  }

  @Test
  fun syncRequests_fromContainerStore_arePropagatedToProxy() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)

    // Set up proxy.
    val deferredMessage =
      CompletableDeferred<ProxyMessage<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>>()
    val id = activeStore.on {
      deferredMessage.complete(it)
    }

    val storeHelper = RefModeStoreHelper("me", activeStore, id)
    val bobEntity = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    val aliceEntity = createPersonEntity("id1", "alice", 10, listOf(10L, 10L), "inline1")
    storeHelper.sendAddOp(bobEntity)
    storeHelper.sendAddOp(aliceEntity)

    // Send an invalid operation proxy message to the containerStore. This will result in a
    // SyncRequest on the callback.
    val versionMap = VersionMap("me" to 2)
    val ops = RefModeStoreOp.SetAdd("me", versionMap, aliceEntity)

    activeStore.onProxyMessage(ProxyMessage.Operations(listOf(ops), id))
    val message = deferredMessage.await()
    assertThat(message).isInstanceOf(ProxyMessage.SyncRequest::class.java)
  }

  @Test
  fun entityVersion_isIncremented() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val storeHelper = RefModeStoreHelper("me", activeStore)
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")

    storeHelper.sendAddOp(bob)

    // The actor is non-deterministic, we can check that there is only one actor and its version is
    // the initial version value.
    // TODO(b/175505629): fix initialVersion once "version too big" bug has been fixed.
    val initialVersion = if (BuildFlags.REFERENCE_MODE_STORE_FIXES) 2 else 1
    assertThat(
      activeStore.getLocalData("an-id").versionMap.backingMap.values
    ).containsExactly(initialVersion)

    storeHelper.sendAddOp(bob)

    // Check that the entity version has been incremented.
    assertThat(
      activeStore.getLocalData("an-id").versionMap.backingMap.values
    ).containsExactly(initialVersion + 1)
  }

  @Test
  fun entityVersion_reset_onClearOp() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val storeHelper = RefModeStoreHelper("me", activeStore)
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")

    // TODO(b/175505629): fix initialVersion once "version too big" bug has been fixed.
    val initialVersion = if (BuildFlags.REFERENCE_MODE_STORE_FIXES) 2 else 1
    storeHelper.sendAddOp(bob)
    assertThat(
      activeStore.getLocalData("an-id").versionMap.backingMap.values
    ).containsExactly(initialVersion)

    // Now clear the container store.
    activeStore.containerStore.onProxyMessage(
      ProxyMessage.Operations(
        listOf(
          CrdtSet.Operation.Clear<RawReference>(
            "me",
            activeStore.containerStore.getLocalData().versionMap
          )
        ),
        null
      )
    )

    // Now re-add Bob. If the versions map was correctly cleared, we should still be at initial
    // version number.
    storeHelper.sendAddOp(bob)
    assertThat(
      activeStore.getLocalData("an-id").versionMap.backingMap.values
    ).containsExactly(initialVersion)
  }

  @Test
  fun entityVersion_reset_onRemoveOp() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val storeHelper = RefModeStoreHelper("me", activeStore)
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")

    // TODO(b/175505629): fix initialVersion once "version too big" bug has been fixed.
    val initialVersion = if (BuildFlags.REFERENCE_MODE_STORE_FIXES) 2 else 1
    storeHelper.sendAddOp(bob)
    assertThat(
      activeStore.getLocalData("an-id").versionMap.backingMap.values
    ).containsExactly(initialVersion)

    // Now remove from the container with a remove op.
    activeStore.containerStore.onProxyMessage(
      ProxyMessage.Operations(
        listOf(
          CrdtSet.Operation.Remove<RawReference>(
            "me",
            activeStore.containerStore.getLocalData().versionMap,
            "an-id"
          )
        ),
        null
      )
    )

    // Now re-add Bob. If the versions map was correctly cleared, we should still be at the initial
    // version.
    storeHelper.sendAddOp(bob)
    assertThat(
      activeStore.getLocalData("an-id").versionMap.backingMap.values
    ).containsExactly(initialVersion)
  }

  @Test
  fun entityVersion_reset_onModelUpdate() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val storeHelper = RefModeStoreHelper("me", activeStore)
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")

    // TODO(b/175505629): fix initialVersion once "version too big" bug has been fixed.
    val initialVersion = if (BuildFlags.REFERENCE_MODE_STORE_FIXES) 2 else 1
    storeHelper.sendAddOp(bob)
    assertThat(
      activeStore.getLocalData("an-id").versionMap.backingMap.values
    ).containsExactly(initialVersion)

    // Now clear the container store sending an empty model.
    activeStore.containerStore.onProxyMessage(
      ProxyMessage.ModelUpdate(
        CrdtSet(CrdtSet.DataImpl<RawReference>(versionMap = VersionMap("me" to 2))).data,
        null
      )
    )

    // Now re-add Bob. If the versions map was correctly cleared, we should still be the initial
    // version.
    storeHelper.sendAddOp(bob)
    assertThat(
      activeStore.getLocalData("an-id").versionMap.backingMap.values
    ).containsExactly(initialVersion)
  }

  protected suspend fun collectionReferenceModeStore(scope: CoroutineScope): ReferenceModeStore {
    return ReferenceModeStore.collectionTestStore(
      TEST_KEY,
      SCHEMA,
      scope = scope,
      driverFactory = driverFactory
    )
  }

  protected suspend fun singletonReferenceModeStore(scope: CoroutineScope): ReferenceModeStore {
    return ReferenceModeStore.singletonTestStore(
      TEST_KEY,
      SCHEMA,
      scope = scope,
      driverFactory = driverFactory
    )
  }

  /** Constructs a new [CrdtSet] paired with a [CrdtSetHelper]. */
  protected fun <T : Referencable> createCrdtSet(
    actor: String
  ): Pair<CrdtSet<T>, CrdtSetHelper<T>> {
    val collection = CrdtSet<T>()
    val collectionHelper = CrdtSetHelper(actor, collection)
    return collection to collectionHelper
  }

  protected fun createPersonEntity(
    id: ReferenceId,
    name: String,
    age: Int,
    list: List<Long>,
    inline: String
  ): RawEntity {
    val inlineEntity = RawEntity(
      "",
      singletons = mapOf(
        "inlineName" to inline.toReferencable()
      )
    )

    return RawEntity(
      id = id,
      singletons = mapOf(
        "name" to name.toReferencable(),
        "age" to age.toDouble().toReferencable(),
        "list" to list.map {
          it.toReferencable()
        }.toReferencable(FieldType.ListOf(FieldType.Long)),
        "inline" to inlineEntity
      )
    )
  }

  protected fun createEmptyPersonEntity(id: ReferenceId): RawEntity = RawEntity(
    id = id,
    singletons = mapOf(
      "name" to null,
      "age" to null,
      "list" to null,
      "inline" to null
    )
  )

  protected fun createPersonEntityCrdt(): CrdtEntity = CrdtEntity.newWithEmptyEntity(
    RawEntity(singletonFields = setOf("name", "age", "list", "inline"))
  )
}
