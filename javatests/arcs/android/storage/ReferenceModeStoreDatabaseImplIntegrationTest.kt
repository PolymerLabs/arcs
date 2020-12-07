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
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SchemaRegistry
import arcs.core.data.SingletonType
import arcs.core.data.util.toReferencable
import arcs.core.storage.DefaultDriverFactory
import arcs.core.storage.MuxedProxyMessage
import arcs.core.storage.ProxyMessage
import arcs.core.storage.Reference
import arcs.core.storage.ReferenceModeStore
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.StoreOptions
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.ReferenceWithVersion
import arcs.core.storage.driver.DatabaseDriver
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testDatabaseDriverFactory
import arcs.core.storage.testutil.testWriteBackProvider
import arcs.core.storage.toReference
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("UNCHECKED_CAST", "EXPERIMENTAL_IS_NOT_ENABLED")
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class ReferenceModeStoreDatabaseImplIntegrationTest {
  @get:Rule
  val logRule = LogRule()

  private var hash = "123456abcdef"
  private var testKey = ReferenceModeStorageKey(
    DatabaseStorageKey.Persistent("entities", hash),
    DatabaseStorageKey.Persistent("set", hash)
  )
  private var inlineSchema = Schema(
    setOf(SchemaName("Inline")),
    SchemaFields(
      singletons = mapOf(
        "inlineName" to FieldType.Text
      ),
      collections = emptyMap()
    ),
    "inlineHash"
  )
  private var schema = Schema(
    setOf(SchemaName("person")),
    SchemaFields(
      singletons = mapOf(
        "name" to FieldType.Text,
        "age" to FieldType.Number,
        "list" to FieldType.ListOf(FieldType.Long),
        "inline" to FieldType.InlineEntity("inlineHash")
      ),
      collections = emptyMap()
    ),
    hash
  )
  private lateinit var databaseFactory: AndroidSqliteDatabaseManager

  @Before
  fun setUp() = runBlockingTest {
    SchemaRegistry.register(inlineSchema)
    databaseFactory = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
    StorageKeyManager.GLOBAL_INSTANCE.reset(DatabaseStorageKey.Persistent)
    DatabaseDriverProvider.configure(databaseFactory) {
      when (it) {
        hash -> schema
        "inlineHash" -> inlineSchema
        else -> null
      }
    }
    DefaultDriverFactory.update(DatabaseDriverProvider)
  }

  @After
  fun tearDown() = runBlockingTest {
    databaseFactory.resetAll()
  }

  @Test
  fun propagatesModelUpdates_fromProxies_toDrivers() = runBlockingTest {
    val activeStore = createReferenceModeStore()

    val collection = CrdtSet<RawEntity>()
    val entity = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    collection.applyOperation(
      CrdtSet.Operation.Add("me", VersionMap("me" to 1), entity)
    )

    logRule("Sending ModelUpdate")

    activeStore.onProxyMessage(
      ProxyMessage.ModelUpdate(RefModeStoreData.Set(collection.data), 1)
    )

    activeStore.idle()

    logRule("ModelUpdate sent")

    val actor = activeStore.crdtKey
    val containerKey = activeStore.containerStore.storageKey as DatabaseStorageKey
    val database = databaseFactory.getDatabase(
      containerKey.dbName,
      containerKey is DatabaseStorageKey.Persistent
    )

    val capturedCollection = requireNotNull(
      database.get(containerKey, DatabaseData.Collection::class, schema)
    ) as DatabaseData.Collection

    assertThat(capturedCollection.values)
      .containsExactly(
        ReferenceWithVersion(
          Reference("an-id", activeStore.backingStore.storageKey, VersionMap(actor to 1)),
          VersionMap("me" to 1)
        )
      )

    val bobKey = activeStore.backingStore.storageKey.childKeyWithComponent("an-id")
    val capturedBob = requireNotNull(
      database.get(bobKey, DatabaseData.Entity::class, schema) as? DatabaseData.Entity
    )

    assertThat(capturedBob.rawEntity.singletons).containsExactly(
      "name", "bob".toReferencable(),
      "age", 42.0.toReferencable(),
      "list",
      listOf(1L, 1L, 2L).map { it.toReferencable() }
        .toReferencable(FieldType.ListOf(FieldType.Long)),
      "inline", RawEntity("", mapOf("inlineName" to "inline".toReferencable()))
    )
    assertThat(capturedBob.rawEntity.collections).isEmpty()
  }

  @Test
  fun appliesAndPropagatesOperationUpdate_fromProxies_toDrivers() = runBlockingTest {
    val activeStore = createReferenceModeStore()
    val actor = activeStore.crdtKey

    val personCollection = CrdtSet<RawEntity>()
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    val operation = CrdtSet.Operation.Add("me", VersionMap("me" to 1), bob)

    val referenceCollection = CrdtSet<Reference>()
    val bobRef = Reference(
      "an-id",
      activeStore.backingStore.storageKey,
      VersionMap(actor to 1)
    )
    val refOperation = CrdtSet.Operation.Add("me", VersionMap("me" to 1), bobRef)

    val bobEntity = createPersonEntityCrdt()

    // Apply to RefMode store.
    activeStore.onProxyMessage(
      ProxyMessage.Operations(
        listOf(RefModeStoreOp.SetAdd("me", VersionMap("me" to 1), bob)),
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
          CrdtEntity.ReferenceImpl(42.0.toReferencable().id)
        )
      )
    ).isTrue()
    assertThat(
      bobEntity.applyOperation(
        CrdtEntity.Operation.SetSingleton(
          actor,
          VersionMap(actor to 1),
          "list",
          CrdtEntity.WrappedReferencable(
            listOf(1L, 1L, 2L).map { it.toReferencable() }
              .toReferencable(FieldType.ListOf(FieldType.Long))
          )
        )
      )
    ).isTrue()
    assertThat(
      bobEntity.applyOperation(
        CrdtEntity.Operation.SetSingleton(
          actor,
          VersionMap(actor to 1),
          "inline",
          CrdtEntity.WrappedReferencable(
            RawEntity("", mapOf("inlineName" to "inline".toReferencable()))
          )
        )
      )
    ).isTrue()

    val containerKey = activeStore.containerStore.storageKey as DatabaseStorageKey
    val capturedPeople =
      databaseFactory.getDatabase(
        containerKey.dbName,
        containerKey is DatabaseStorageKey.Persistent
      ).get(
        containerKey,
        DatabaseData.Collection::class,
        schema
      ) as DatabaseData.Collection

    assertThat(capturedPeople.values)
      .containsExactly(
        ReferenceWithVersion(
          Reference("an-id", activeStore.backingStore.storageKey, capturedPeople.versionMap),
          capturedPeople.versionMap
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
    val activeStore = createReferenceModeStore()
    val actor = activeStore.crdtKey
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")

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

    // Check the DB.
    val backingKey = activeStore.backingStore.storageKey as DatabaseStorageKey
    val database = databaseFactory.getDatabase(
      backingKey.dbName,
      backingKey is DatabaseStorageKey.Persistent
    )
    val bobKey = backingKey.childKeyWithComponent("an-id")
    val capturedBob = requireNotNull(
      database.get(bobKey, DatabaseData.Entity::class, schema) as? DatabaseData.Entity
    )
    // Name and age have been cleared (their values are null).
    assertThat(capturedBob.rawEntity).isEqualTo(
      RawEntity(
        "an-id",
        singletons = mapOf(
          "age" to null,
          "name" to null,
          "list" to null,
          "inline" to null
        )
      )
    )
  }

  @Test
  fun singletonClearFreesBackingStoreCopy() = runBlockingTest {
    val activeStore = createSingletonReferenceModeStore()
    val actor = activeStore.crdtKey
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")

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
    val alice = createPersonEntity("a-id", "alice", 41, listOf(1L, 1L, 2L), "inline")
    val bob = createPersonEntity("b-id", "bob", 42, listOf(1L, 1L, 2L), "inline")

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
  fun keepsEntityTimestamps() = runBlockingTest {
    val activeStore = createReferenceModeStore()
    val actor = activeStore.crdtKey
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
    val addOp = RefModeStoreOp.SetAdd(actor, VersionMap(actor to 1), bob)
    activeStore.onProxyMessage(ProxyMessage.Operations(listOf(addOp), id = 1))

    activeStore.idle()

    // Check Bob from backing store.
    val storedBob = activeStore.getLocalData("an-id")
    assertThat(storedBob.toRawEntity()).isEqualTo(bob)
    assertThat(storedBob.toRawEntity().creationTimestamp).isEqualTo(10)
    assertThat(storedBob.toRawEntity().expirationTimestamp).isEqualTo(20)

    // Check Bob in the database.
    val backingKey = activeStore.backingStore.storageKey as DatabaseStorageKey
    val database = databaseFactory.getDatabase(backingKey.dbName, true)
    val bobKey = backingKey.childKeyWithComponent("an-id")
    val dbBob = requireNotNull(
      database.get(bobKey, DatabaseData.Entity::class, schema) as? DatabaseData.Entity
    )
    assertThat(dbBob.rawEntity).isEqualTo(bob)
    assertThat(dbBob.rawEntity.creationTimestamp).isEqualTo(10)
    assertThat(dbBob.rawEntity.expirationTimestamp).isEqualTo(20)
  }

  @Test
  fun respondsToAModelRequest_fromProxy_withModel() = runBlockingTest {
    val activeStore = createReferenceModeStore()

    val entityCollection = CrdtSet<RawEntity>()
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    entityCollection.applyOperation(CrdtSet.Operation.Add("me", VersionMap("me" to 1), bob))

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
    val activeStore = createReferenceModeStore()

    val bobCollection = CrdtSet<RawEntity>()
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
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
        CrdtEntity.Reference.buildReference(42.0.toReferencable())
      )
    )
    bobCrdt.applyOperation(
      CrdtEntity.Operation.SetSingleton(
        actor,
        VersionMap(actor to 1),
        "list",
        CrdtEntity.Reference.wrapReferencable(
          listOf(1L, 1L, 2L).map {
            it.toReferencable()
          }.toReferencable(FieldType.ListOf(FieldType.Long))
        )
      )
    )
    bobCrdt.applyOperation(
      CrdtEntity.Operation.SetSingleton(
        actor,
        VersionMap(actor to 1),
        "inline",
        CrdtEntity.Reference.wrapReferencable(
          RawEntity("", mapOf("inlineName" to "inline".toReferencable()))
        )
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
    val activeStore = createReferenceModeStore()

    val driver = activeStore.containerStore.driver as DatabaseDriver<CrdtSet.Data<Reference>>

    val e1 = createPersonEntity("e1", "e1", 1, listOf(1L, 1L, 2L), "inline")
    val e2 = createPersonEntity("e2", "e2", 2, listOf(1L, 1L, 3L), "inline2")
    val e3 = createPersonEntity("e3", "e3", 3, listOf(1L, 1L, 4L), "inline3")

    activeStore.onProxyMessage(
      ProxyMessage.Operations(
        listOf(RefModeStoreOp.SetAdd("me", VersionMap("me" to 1), e1)),
        id = 1
      )
    )
    activeStore.onProxyMessage(
      ProxyMessage.Operations(
        listOf(RefModeStoreOp.SetAdd("me", VersionMap("me" to 2), e2)),
        id = 1
      )
    )
    activeStore.onProxyMessage(
      ProxyMessage.Operations(
        listOf(RefModeStoreOp.SetAdd("me", VersionMap("me" to 3), e3)),
        id = 1
      )
    )

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
    val activeStore = createReferenceModeStore()
    val actor = activeStore.crdtKey

    val referenceCollection = CrdtSet<Reference>()
    val ref = Reference("an-id", activeStore.backingStore.storageKey, VersionMap(actor to 1))
    referenceCollection.applyOperation(
      CrdtSet.Operation.Add(actor, VersionMap(actor to 1), ref)
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
        CrdtEntity.Reference.buildReference(42.0.toReferencable())
      )
    )

    val backingJob = launch {
      val backingStore = activeStore.backingStore.stores.getValue("an-id")
      backingStore.store.onReceive(entityCrdt.data, id + 2)
    }

    activeStore.idle()

    job.join()
    backingJob.join()
    containerJob.join()
  }

  private suspend fun createReferenceModeStore(): ReferenceModeStore {
    return ReferenceModeStore.create(
      StoreOptions(
        testKey,
        CollectionType(EntityType(schema))
      ),
      CoroutineScope(coroutineContext),
      testDatabaseDriverFactory,
      ::testWriteBackProvider,
      null
    )
  }

  private suspend fun createSingletonReferenceModeStore(): ReferenceModeStore {
    return ReferenceModeStore.create(
      StoreOptions(
        testKey,
        SingletonType(EntityType(schema))
      ),
      CoroutineScope(coroutineContext),
      testDatabaseDriverFactory,
      ::testWriteBackProvider,
      null
    )
  }

  private fun createPersonEntity(
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

  private fun createEmptyPersonEntity(id: ReferenceId): RawEntity = RawEntity(
    id = id,
    singletons = mapOf(
      "name" to null,
      "age" to null,
      "list" to null,
      "inline" to null
    )
  )

  private fun createPersonEntityCrdt(): CrdtEntity = CrdtEntity(
    VersionMap(),
    RawEntity(singletonFields = setOf("name", "age", "list", "inline"))
  )

  /**
   * Asserts that the receiving map of entities (values from a CrdtSet/CrdtSingleton) are equal to
   * the [other] map of entities, on an ID-basis.
   */
  private fun Map<ReferenceId, CrdtSet.DataValue<RawEntity>>.assertEquals(
    other: Map<ReferenceId, CrdtSet.DataValue<RawEntity>>
  ) {
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
}
