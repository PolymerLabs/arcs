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

import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.data.util.toReferencable
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.RefModeStoreOutput
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.MockDriver
import arcs.core.storage.testutil.MockDriverProvider
import arcs.core.storage.testutil.testWriteBackProvider
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for the [ReferenceModeStore]. */
@Suppress("UNCHECKED_CAST")
@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ReferenceModeStoreTest {
  @get:Rule
  val log = LogRule()

  private lateinit var testKey: ReferenceModeStorageKey
  private lateinit var schema: Schema

  @Before
  fun setup() = runBlockingTest {
    testKey = ReferenceModeStorageKey(
      MockHierarchicalStorageKey(),
      MockHierarchicalStorageKey()
    )
    schema = Schema(
      setOf(SchemaName("person")),
      SchemaFields(
        singletons = mapOf("name" to FieldType.Text, "age" to FieldType.Number),
        collections = emptyMap()
      ),
      "hash"
    )
  }

  private val driverFactory = FixedDriverFactory(MockDriverProvider())

  @Test
  fun throwsException_ifAppropriateDriverCantBeFound() = runBlockingTest {
    assertSuspendingThrows(CrdtException::class) {
      ActiveStore<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>(
        StoreOptions(
          testKey,
          SingletonType(EntityType(schema))
        ),
        this,
        FixedDriverFactory(),
        ::testWriteBackProvider,
        null
      )
    }
  }

  @Test
  fun constructsReferenceModeStores_whenRequired() = runBlockingTest {
    val store = ActiveStore<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>(
      StoreOptions(
        testKey,
        CollectionType(EntityType(schema))
      ),
      this,
      driverFactory,
      ::testWriteBackProvider,
      null
    )

    assertThat(store).isInstanceOf(ReferenceModeStore::class.java)
  }

  @Test
  fun propagatesModelUpdates_fromProxies_toDrivers() = runBlockingTest {
    val activeStore = createReferenceModeStore()

    val collection = CrdtSet<RawEntity>()
    val entity = createPersonEntity("an-id", "bob", 42)
    collection.applyOperation(
      CrdtSet.Operation.Add("me", VersionMap("me" to 1), entity)
    )

    activeStore.onProxyMessage(
      ProxyMessage.ModelUpdate(RefModeStoreData.Set(collection.data), 1)
    )

    val actor = activeStore.crdtKey

    val containerStoreDriver = requireNotNull(
      activeStore.containerStore.driver as? MockDriver<CrdtSet.Data<Reference>>
    ) { "ContainerStore Driver is not of expected type: CrdtSet.Data<Reference>" }

    val capturedCollection = containerStoreDriver.sentData.first()

    assertThat(capturedCollection.values)
      .containsExactly(
        "an-id",
        CrdtSet.DataValue(
          VersionMap("me" to 1),
          Reference("an-id", activeStore.backingStore.storageKey, VersionMap(actor to 1))
        )
      )

    val bobDriver = activeStore.backingStore.getEntityDriver("an-id")
    val capturedBob = bobDriver.sentData.first()
    assertThat(capturedBob.singletons["name"]?.data?.versionMap)
      .isEqualTo(VersionMap(actor to 1))
    assertThat(capturedBob.singletons["age"]?.data?.versionMap)
      .isEqualTo(VersionMap(actor to 1))
    assertThat(capturedBob.toRawEntity().singletons)
      .containsExactly(
        "name", "bob".toReferencable(),
        "age", 42.toReferencable()
      )
  }

  @Test
  fun appliesAndPropagatesOperationUpdate_fromProxies_toDrivers() = runBlockingTest {
    val activeStore = createReferenceModeStore()
    val actor = activeStore.crdtKey

    val personCollection = CrdtSet<RawEntity>()
    val bob = createPersonEntity("an-id", "bob", 42)
    val operation = CrdtSet.Operation.Add("me", VersionMap("me" to 1), bob)

    val referenceCollection = CrdtSet<Reference>()
    val bobRef = Reference(
      "an-id",
      activeStore.backingStore.storageKey,
      VersionMap(actor to 1)
    )
    val refOperation = CrdtSet.Operation.Add(actor, VersionMap(actor to 1), bobRef)

    val bobEntity = createPersonEntityCrdt()

    // Apply to RefMode store.
    activeStore.onProxyMessage(
      ProxyMessage.Operations(
        listOf(RefModeStoreOp.SetAdd(actor, VersionMap(actor to 1), bob)),
        id = 1
      )
    )

    // Apply to expected collection representation
    assertThat(personCollection.applyOperation(operation)).isTrue()
    // Apply to expected refMode collectionStore data.
    assertThat(referenceCollection.applyOperation(refOperation)).isTrue()
    // Apply to expected refMode backingStore data.
    assertThat(
      bobEntity.applyOperation(
        CrdtEntity.Operation.SetSingleton(
          actor,
          VersionMap(actor to 1),
          "name",
          CrdtEntity.ReferenceImpl("bob".toReferencable().id)
        )
      )
    ).isTrue()
    assertThat(
      bobEntity.applyOperation(
        CrdtEntity.Operation.SetSingleton(
          actor,
          VersionMap(actor to 1),
          "age",
          CrdtEntity.ReferenceImpl(42.toReferencable().id)
        )
      )
    ).isTrue()

    val containerDriver =
      activeStore.containerStore.driver as MockDriver<CrdtSet.Data<Reference>>

    val capturedPeople = containerDriver.sentData.first()
    assertThat(capturedPeople).isEqualTo(referenceCollection.data)
    val storedBob = activeStore.getLocalData("an-id")
    // Check that the stored bob's singleton data is equal to the expected bob's singleton data
    assertThat(storedBob.singletons.mapValues { it.value.data })
      .isEqualTo(bobEntity.data.singletons.mapValues { it.value.data })
    // Check that the stored bob's collection data is equal to the expected bob's collection
    // data (empty)
    assertThat(storedBob.collections.mapValues { it.value.data })
      .isEqualTo(bobEntity.data.collections.mapValues { it.value.data })
  }

  @Test
  fun removeOpClearsBackingEntity() = runBlockingTest {
    val activeStore = createReferenceModeStore()
    val actor = activeStore.crdtKey
    val bob = createPersonEntity("an-id", "bob", 42)

    // Add Bob to collection.
    val addOp = RefModeStoreOp.SetAdd(actor, VersionMap(actor to 1), bob)
    activeStore.onProxyMessage(ProxyMessage.Operations(listOf(addOp), id = 1))

    // Bob was added to the backing store.
    val storedBob = activeStore.getLocalData("an-id")
    assertThat(storedBob.toRawEntity("an-id")).isEqualTo(bob)

    // Remove Bob from the collection.
    val deleteOp = RefModeStoreOp.SetRemove(actor, VersionMap(actor to 1), bob.id)
    activeStore.onProxyMessage(ProxyMessage.Operations(listOf(deleteOp), id = 1))

    // Check the backing store Bob has been cleared.
    val storedBob2 = activeStore.getLocalData("an-id")
    assertThat(storedBob2.toRawEntity("an-id")).isEqualTo(createEmptyPersonEntity("an-id"))
  }

  @Test
  fun clearOpClearsBackingEntities() = runBlockingTest {
    val activeStore = createReferenceModeStore()
    val actor = activeStore.crdtKey

    // Add a couple of people.
    val alice = createPersonEntity("id1", "alice", 10)
    val addOp1 = listOf(RefModeStoreOp.SetAdd(actor, VersionMap(actor to 1), alice))
    activeStore.onProxyMessage(ProxyMessage.Operations(addOp1, id = 1))

    val bob = createPersonEntity("id2", "bob", 20)
    val addOp2 = listOf(RefModeStoreOp.SetAdd(actor, VersionMap(actor to 2), bob))
    activeStore.onProxyMessage(ProxyMessage.Operations(addOp2, id = 2))

    // Verify that they've been stored.
    val storedRefs = activeStore.containerStore.getLocalData() as CrdtSet.Data<Reference>
    assertThat(storedRefs.values.keys).containsExactly("id1", "id2")

    val storedAlice = activeStore.getLocalData("id1")
    assertThat(storedAlice.toRawEntity("id1")).isEqualTo(alice)

    val storedBob = activeStore.getLocalData("id2")
    assertThat(storedBob.toRawEntity("id2")).isEqualTo(bob)

    // Clear!
    val clearOp = listOf(RefModeStoreOp.SetClear(actor, VersionMap(actor to 2)))
    activeStore.onProxyMessage(ProxyMessage.Operations(clearOp, null))

    val clearedRefs = activeStore.containerStore.getLocalData() as CrdtSet.Data<Reference>
    assertThat(clearedRefs.values.keys).isEmpty()

    val clearedAlice = activeStore.getLocalData("id1")
    assertThat(clearedAlice.toRawEntity("id1")).isEqualTo(createEmptyPersonEntity("id1"))

    val clearedBob = activeStore.getLocalData("id2")
    assertThat(clearedBob.toRawEntity("id2")).isEqualTo(createEmptyPersonEntity("id2"))
  }

  @Test
  fun singletonClearFreesBackingStoreCopy() = runBlockingTest {
    val activeStore = createSingletonReferenceModeStore()
    val actor = activeStore.crdtKey
    val bob = createPersonEntity("an-id", "bob", 42)

    // Set singleton to Bob.
    val updateOp = RefModeStoreOp.SingletonUpdate(actor, VersionMap(actor to 1), bob)
    activeStore.onProxyMessage(ProxyMessage.Operations(listOf(updateOp), id = 1))

    // Bob was added to the backing store.
    assertThat(activeStore.backingStore.stores.keys).containsExactly("an-id")

    // Remove Bob from the collection.
    val clearOp = RefModeStoreOp.SingletonClear(actor, VersionMap(actor to 1))
    activeStore.onProxyMessage(ProxyMessage.Operations(listOf(clearOp), id = 1))

    // Check memory copy has been freed.
    assertThat(activeStore.backingStore.stores.keys).isEmpty()
  }

  @Test
  fun singletonUpdateFreesBackingStoreCopy() = runBlockingTest {
    val activeStore = createSingletonReferenceModeStore()
    val actor = activeStore.crdtKey
    val alice = createPersonEntity("a-id", "alice", 41)
    val bob = createPersonEntity("b-id", "bob", 42)

    // Set singleton to Bob.
    val updateOp = RefModeStoreOp.SingletonUpdate(actor, VersionMap(actor to 1), bob)
    activeStore.onProxyMessage(ProxyMessage.Operations(listOf(updateOp), id = 1))

    // Bob was added to the backing store.
    assertThat(activeStore.backingStore.stores.keys).containsExactly("b-id")

    // Set singleton to Alice.
    val updateOp2 = RefModeStoreOp.SingletonUpdate(actor, VersionMap(actor to 2), alice)
    activeStore.onProxyMessage(ProxyMessage.Operations(listOf(updateOp2), id = 1))

    // Check Bob's memory copy has been freed.
    assertThat(activeStore.backingStore.stores.keys).containsExactly("a-id")
  }

  @Test
  fun respondsToAModelRequest_fromProxy_withModel() = runBlockingTest {
    val activeStore = createReferenceModeStore()

    val entityCollection = CrdtSet<RawEntity>()
    val bob = createPersonEntity("an-id", "bob", 42)
    entityCollection.applyOperation(CrdtSet.Operation.Add("me", VersionMap("me" to 1), bob))

    var sentSyncRequest = false
    val job = Job(coroutineContext[Job.Key])
    var id: Int = -1
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

    activeStore.onProxyMessage(
      ProxyMessage.Operations(
        listOf(RefModeStoreOp.SetAdd("me", VersionMap("me" to 1), bob)),
        // Use +1 because we don't want the activeStore to omit sending to our callback
        // (which should have id=1)
        id = id + 1
      )
    )
    job.join()
  }

  @Test
  fun onlySendsModelResponse_toRequestingProxy() = runBlockingTest {
    val activeStore = createReferenceModeStore()

    val job = Job(coroutineContext[Job.Key])
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
    val activeStore = createReferenceModeStore()

    val bobCollection = CrdtSet<RawEntity>()
    val bob = createPersonEntity("an-id", "bob", 42)
    bobCollection.applyOperation(CrdtSet.Operation.Add("me", VersionMap("me" to 1), bob))

    val referenceCollection = CrdtSet<Reference>()
    val bobRef = bob.toReference(activeStore.backingStore.storageKey, VersionMap("me" to 1))
    referenceCollection.applyOperation(
      CrdtSet.Operation.Add("me", VersionMap("me" to 1), bobRef)
    )

    val bobCrdt = createPersonEntityCrdt()
    val actor = activeStore.crdtKey
    bobCrdt.applyOperation(
      CrdtEntity.Operation.SetSingleton(
        actor,
        VersionMap(actor to 1),
        "name",
        CrdtEntity.Reference.buildReference("bob".toReferencable())
      )
    )
    bobCrdt.applyOperation(
      CrdtEntity.Operation.SetSingleton(
        actor,
        VersionMap(actor to 1),
        "age",
        CrdtEntity.Reference.buildReference(42.toReferencable())
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

    val driver = activeStore.containerStore.driver as MockDriver<CrdtSet.Data<Reference>>
    driver.receiver!!(referenceCollection.data, 1)
    job.join()
  }

  @Ignore("This test can be enabled when we output operations from collection model merges")
  @Test
  fun wontSendAnUpdate_toDriver_afterDriverOriginatedMessages() = runBlockingTest {
    val activeStore = createReferenceModeStore()

    val referenceCollection = CrdtSet<Reference>()
    val reference = Reference("an-id", MockHierarchicalStorageKey(), VersionMap("me" to 1))
    referenceCollection.applyOperation(
      CrdtSet.Operation.Add("me", VersionMap("me" to 1), reference)
    )

    val driver = activeStore.containerStore.driver as MockDriver<CrdtSet.Data<Reference>>

    driver.receiver!!(referenceCollection.data, 1)

    assertThat(driver.sentData).isEmpty()
  }

  @Test
  fun resendsFailedDriverUpdates_afterMerging() = runBlockingTest {
    val activeStore = createReferenceModeStore()

    // local model from proxy.
    val bobCollection = CrdtSet<RawEntity>()
    val bob = createPersonEntity("an-id", "bob", 42)
    bobCollection.applyOperation(CrdtSet.Operation.Add("me", VersionMap("me" to 1), bob))

    // conflicting remote count from store
    val remoteCollection = CrdtSet<Reference>()
    val reference =
      Reference("another-id", MockHierarchicalStorageKey(), VersionMap("them" to 1))
    remoteCollection.applyOperation(
      CrdtSet.Operation.Add("them", VersionMap("them" to 1), reference)
    )

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

    val driver = activeStore.containerStore.driver as MockDriver<CrdtSet.Data<Reference>>
    driver.fail = true // make sending return false

    activeStore.onProxyMessage(
      ProxyMessage.ModelUpdate(RefModeStoreData.Set(bobCollection.data), id = 1)
    )
    assertThat(driver.sentData).isNotEmpty() // send should've been called.

    driver.fail = false // make sending work.

    driver.receiver!!(remoteCollection.data, 1)
    assertThat(driver.sentData).hasSize(2) // send should've been called again

    val actor = activeStore.crdtKey
    val ref2 = Reference("an-id", MockHierarchicalStorageKey(), VersionMap(actor to 1))
    remoteCollection.applyOperation(CrdtSet.Operation.Add("me", VersionMap("me" to 1), ref2))
    assertThat(driver.sentData.last()).isEqualTo(remoteCollection.data)
  }

  @Test
  fun resolvesACombination_ofMessages_fromProxy_andDriver() = runBlockingTest {
    val activeStore = createReferenceModeStore()

    val driver = activeStore.containerStore.driver as MockDriver<CrdtSet.Data<Reference>>

    val e1 = createPersonEntity("e1", "e1", 1)
    val e2 = createPersonEntity("e2", "e2", 2)
    val e3 = createPersonEntity("e3", "e3", 3)

    activeStore.onProxyMessage(
      ProxyMessage.Operations(
        listOf(RefModeStoreOp.SetAdd("me", VersionMap("me" to 1), e1)),
        id = activeStore.backingStoreId
      )
    )
    activeStore.onProxyMessage(
      ProxyMessage.Operations(
        listOf(RefModeStoreOp.SetAdd("me", VersionMap("me" to 2), e2)),
        id = activeStore.backingStoreId
      )
    )
    activeStore.onProxyMessage(
      ProxyMessage.Operations(
        listOf(RefModeStoreOp.SetAdd("me", VersionMap("me" to 3), e3)),
        id = activeStore.backingStoreId
      )
    )

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

    driver.receiver!!(
      CrdtSet.DataImpl(
        VersionMap("me" to 1, "them" to 1),
        mutableMapOf(
          "e1" to e1Ref,
          "t1" to t1Ref
        )
      ),
      1
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
      2
    )

    activeStore.idle()

    assertThat(activeStore.containerStore.getLocalData())
      .isEqualTo(driver.sentData.last())
  }

  @Test
  fun holdsOnto_containerUpdate_untilBackingDataArrives() = runBlocking {
    val activeStore = createReferenceModeStore()
    val actor = activeStore.crdtKey

    val referenceCollection = CrdtSet<Reference>()
    val ref = Reference("an-id", MockHierarchicalStorageKey(), VersionMap(actor to 1))
    referenceCollection.applyOperation(CrdtSet.Operation.Add("me", VersionMap("me" to 1), ref))

    val job = Job(coroutineContext[Job.Key])
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
        assertThat(entityRecord.singletons["age"]?.id)
          .isEqualTo(42.toReferencable().id)
        job.complete()
      } else {
        job.completeExceptionally(AssertionError("Invalid ProxyMessage type received"))
      }
    }

    val containerJob = launch {
      activeStore.containerStore.onReceive(referenceCollection.data, id + 1)
    }
    containerJob.join()

    backingStoreSent = true

    val entityCrdt = createPersonEntityCrdt()
    entityCrdt.applyOperation(
      CrdtEntity.Operation.SetSingleton(
        actor,
        VersionMap(actor to 1),
        "name",
        CrdtEntity.Reference.buildReference("bob".toReferencable())
      )
    )
    entityCrdt.applyOperation(
      CrdtEntity.Operation.SetSingleton(
        actor,
        VersionMap(actor to 1),
        "age",
        CrdtEntity.Reference.buildReference(42.toReferencable())
      )
    )

    val backingStore = activeStore.backingStore.getStore("an-id", activeStore.backingStoreId)
    backingStore.store.onReceive(entityCrdt.data, id + 2)

    activeStore.idle()

    job.join()
  }

  @Test
  @FlowPreview
  fun backingStoresCleanedUpWhenLastCallbackRemoved() = runBlocking {
    val store = createReferenceModeStore()

    val token = store.on {}

    val collection = CrdtSet<RawEntity>()
    val entity = createPersonEntity("an-id", "bob", 42)

    collection.applyOperation(
      CrdtSet.Operation.Add("me", VersionMap("me" to 1), entity)
    )

    store.onProxyMessage(
      ProxyMessage.ModelUpdate(RefModeStoreData.Set(collection.data), 1)
    )

    store.off(token)
    store.idle()
    assertThat(store.backingStore.stores.size).isEqualTo(0)
  }

  @Test
  fun backingStoresCleanedUpWhenLastCallbackRemovedTwice() = runBlocking {
    val store = createReferenceModeStore()

    val preToken = store.on {}
    store.off(preToken)

    val token = store.on {}
    val collection = CrdtSet<RawEntity>()
    val entity = createPersonEntity("an-id", "bob", 42)

    collection.applyOperation(
      CrdtSet.Operation.Add("me", VersionMap("me" to 1), entity)
    )

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
    val activeStore = createSingletonReferenceModeStore()
    val actor = activeStore.crdtKey
    val bob = createPersonEntity("an-id", "bob", 42)

    // Set singleton to Bob.
    val updateOp = RefModeStoreOp.SingletonUpdate(actor, VersionMap(actor to 1), bob)
    activeStore.onProxyMessage(ProxyMessage.Operations(listOf(updateOp), id = 1))

    assertThat(activeStore.containerStore.closed).isFalse()
    assertThat(activeStore.backingStore.stores).hasSize(1)
    assertThat(activeStore.backingStore.stores.values.single().store.closed).isFalse()

    activeStore.close()

    assertThat(activeStore.containerStore.closed).isTrue()
    assertThat(activeStore.backingStore.stores).isEmpty()
  }

  @Test
  fun backingStoresCleanedUpWhenLastCallbackRemovedRaces() = runBlocking {
    val store = createReferenceModeStore()

    val callbackJob = launch {
      for (i in 0..100) {
        val preToken = store.on {}
        delay(1)
        store.off(preToken)
      }
    }

    val dataJob = launch {
      for (i in 0..100) {
        val collection = CrdtSet<RawEntity>()
        val entity = createPersonEntity("an-id", "bob-$i", 42)

        collection.applyOperation(
          CrdtSet.Operation.Add("me", VersionMap("me" to 1), entity)
        )

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

  // region Helpers

  private fun DirectStoreMuxer<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>.getEntityDriver(
    id: ReferenceId
  ): MockDriver<CrdtEntity.Data> =
    requireNotNull(stores[id]).store.driver as MockDriver<CrdtEntity.Data>

  private suspend fun CoroutineScope.createReferenceModeStore(): ReferenceModeStore {
    return ReferenceModeStore.create(
      StoreOptions(
        testKey,
        CollectionType(EntityType(schema))
      ),
      this,
      driverFactory,
      ::testWriteBackProvider,
      null
    )
  }

  private suspend fun CoroutineScope.createSingletonReferenceModeStore(): ReferenceModeStore {
    return ReferenceModeStore.create(
      StoreOptions(
        testKey,
        SingletonType(EntityType(schema))
      ),
      this,
      driverFactory,
      ::testWriteBackProvider,
      null
    )
  }

  private fun createPersonEntity(id: ReferenceId, name: String, age: Int): RawEntity = RawEntity(
    id = id,
    singletons = mapOf(
      "name" to name.toReferencable(),
      "age" to age.toReferencable()
    )
  )

  private fun createEmptyPersonEntity(id: ReferenceId): RawEntity = RawEntity(
    id = id,
    singletons = mapOf(
      "name" to null,
      "age" to null
    )
  )

  private fun createPersonEntityCrdt(): CrdtEntity = CrdtEntity(
    VersionMap(),
    RawEntity(singletonFields = setOf("name", "age"))
  )

  /**
   * Asserts that the receiving map of entities (values from a CrdtSet/CrdtSingleton) are equal to
   * the [other] map of entities, on an ID-basis.
   */
  private fun Map<ReferenceId, CrdtSet.DataValue<RawEntity>>.assertEquals(
    other: Map<ReferenceId, CrdtSet.DataValue<RawEntity>>
  ) {
    assertThat(keys).isEqualTo(other.keys)
    forEach { (refId, myEntity) ->
      val otherEntity = requireNotNull(other[refId])
      // Should have same fields.
      assertThat(myEntity.value.singletons.keys)
        .isEqualTo(otherEntity.value.singletons.keys)
      assertThat(myEntity.value.collections.keys)
        .isEqualTo(otherEntity.value.collections.keys)

      myEntity.value.singletons.forEach { (field, value) ->
        val otherValue = otherEntity.value.singletons[field]
        assertThat(value?.id).isEqualTo(otherValue?.id)
      }
      myEntity.value.collections.forEach { (field, value) ->
        val otherValue = otherEntity.value.collections[field]
        assertThat(value.size).isEqualTo(otherValue?.size)
        assertThat(value.map { it.id }.toSet())
          .isEqualTo(otherValue?.map { it.id }?.toSet())
      }
    }
  }

  // endregion

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
