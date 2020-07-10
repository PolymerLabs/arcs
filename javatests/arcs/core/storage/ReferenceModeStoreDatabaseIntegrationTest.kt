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
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.ReferenceWithVersion
import arcs.core.storage.driver.DatabaseDriver
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.WriteBackForTesting
import arcs.core.util.testutil.LogRule
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
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
import org.junit.runners.JUnit4

@Suppress("UNCHECKED_CAST")
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class ReferenceModeStoreDatabaseIntegrationTest {
    @get:Rule
    val logRule = LogRule()

    private var hash = "123456abcdef"
    private var testKey = ReferenceModeStorageKey(
        DatabaseStorageKey.Persistent("entities", hash),
        DatabaseStorageKey.Persistent("set", hash)
    )
    private var schema = Schema(
        setOf(SchemaName("person")),
        SchemaFields(
            singletons = mapOf("name" to FieldType.Text, "age" to FieldType.Number),
            collections = emptyMap()
        ),
        hash
    )
    private lateinit var databaseFactory: FakeDatabaseManager

    @Before
    fun setUp() = runBlockingTest {
        DriverFactory.clearRegistrations()
        databaseFactory = FakeDatabaseManager()
        StoreWriteBack.writeBackFactoryOverride = WriteBackForTesting
        DatabaseDriverProvider.configure(databaseFactory) { schema }
    }

    @After
    fun tearDown() {
        WriteBackForTesting.clear()
    }

    @Test
    fun propagatesModelUpdates_fromProxies_toDrivers() = runBlockingTest {
        val activeStore = createReferenceModeStore()

        val collection = CrdtSet<RawEntity>()
        val entity = createPersonEntity("an-id", "bob", 42)
        collection.applyOperation(
            CrdtSet.Operation.Add("me", VersionMap("me" to 1), entity)
        )

        logRule("Sending ModelUpdate")

        assertThat(
            activeStore.onProxyMessage(
                ProxyMessage.ModelUpdate(RefModeStoreData.Set(collection.data), 1)
            )
        ).isTrue()

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
            "age", 42.toReferencable()
        )
        assertThat(capturedBob.rawEntity.collections).isEmpty()
    }

    @Test
    fun databaseRoundtrip() = runBlockingTest {
        val activeStore = createReferenceModeStore()

        val e1 = createPersonEntity("e1", "e1", 1)
        val e2 = createPersonEntity("e2", "e2", 2)
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

        // Read data (using a new store ensures we read from the db instead of using cached values).
        val activeStore2 = createReferenceModeStore()
        val e1Ref = CrdtSet.DataValue(
            VersionMap("me" to 1),
            Reference("e1", activeStore2.backingStore.storageKey, VersionMap("me" to 1))
        )
        val e2Ref = CrdtSet.DataValue(
            VersionMap("me" to 2),
            Reference("e2", activeStore2.backingStore.storageKey, VersionMap("me" to 2))
        )

        assertThat(activeStore2.containerStore.getLocalData()).isEqualTo(CrdtSet.DataImpl(
            VersionMap("me" to 2),
            mutableMapOf(
                "e1" to e1Ref,
                "e2" to e2Ref
            )
        ))
        assertThat((activeStore2.backingStore.getLocalData("e1") as CrdtEntity.Data).toRawEntity())
            .isEqualTo(e1)
        assertThat((activeStore2.backingStore.getLocalData("e2") as CrdtEntity.Data).toRawEntity())
            .isEqualTo(e2)
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
        val refOperation = CrdtSet.Operation.Add("me", VersionMap("me" to 1), bobRef)

        val bobEntity = createPersonEntityCrdt()

        // Apply to RefMode store.
        assertThat(
            activeStore.onProxyMessage(
                ProxyMessage.Operations(
                    listOf(RefModeStoreOp.SetAdd("me", VersionMap("me" to 1), bob)),
                    id = 1
                )
            )
        ).isTrue()

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
                    Reference("an-id", activeStore.backingStore.storageKey, VersionMap(actor to 1)),
                    VersionMap("me" to 1)
                )
            )
        val storedBob = activeStore.backingStore.getLocalData("an-id") as CrdtEntity.Data
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
        val bob = createPersonEntity("an-id", "bob", 42)

        // Add Bob to collection.
        val addOp = RefModeStoreOp.SetAdd(actor, VersionMap(actor to 1), bob)
        assertThat(
            activeStore.onProxyMessage(ProxyMessage.Operations(listOf(addOp), id = 1))
        ).isTrue()
        // Bob was added to the backing store.
        val storedBob = activeStore.backingStore.getLocalData("an-id") as CrdtEntity.Data
        assertThat(storedBob.toRawEntity("an-id")).isEqualTo(bob)

        // Remove Bob from the collection.
        val deleteOp = RefModeStoreOp.SetRemove(actor, VersionMap(actor to 1), bob)
        assertThat(
            activeStore.onProxyMessage(ProxyMessage.Operations(listOf(deleteOp), id = 1))
        ).isTrue()

        // Check the backing store Bob has been cleared.
        val storedBob2 = activeStore.backingStore.getLocalData("an-id") as CrdtEntity.Data
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

        assertThat(capturedBob.rawEntity).isEqualTo(createEmptyPersonEntity("an-id"))
    }

    @Test
    fun singletonClearFreesBackingStoreCopy() = runBlockingTest {
        val activeStore = createSingletonReferenceModeStore()
        val actor = activeStore.crdtKey
        val bob = createPersonEntity("an-id", "bob", 42)

        // Set singleton to Bob.
        val updateOp = RefModeStoreOp.SingletonUpdate(actor, VersionMap(actor to 1), bob)
        assertThat(
            activeStore.onProxyMessage(ProxyMessage.Operations(listOf(updateOp), id = 1))
        ).isTrue()
        // Bob was added to the backing store.
        assertThat(activeStore.backingStore.stores.keys).containsExactly("an-id")

        // Remove Bob from the collection.
        val clearOp = RefModeStoreOp.SingletonClear(actor, VersionMap(actor to 1))
        assertThat(
            activeStore.onProxyMessage(ProxyMessage.Operations(listOf(clearOp), id = 1))
        ).isTrue()

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
        assertThat(
            activeStore.onProxyMessage(ProxyMessage.Operations(listOf(updateOp), id = 1))
        ).isTrue()
        // Bob was added to the backing store.
        assertThat(activeStore.backingStore.stores.keys).containsExactly("b-id")

        // Set singleton to Alice.
        val updateOp2 = RefModeStoreOp.SingletonUpdate(actor, VersionMap(actor to 2), alice)
        assertThat(
            activeStore.onProxyMessage(ProxyMessage.Operations(listOf(updateOp2), id = 1))
        ).isTrue()

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
        val job = Job(coroutineContext[Job])
        var id: Int = -1
        id = activeStore.on(ProxyCallback {
            if (it is ProxyMessage.Operations) {
                assertThat(sentSyncRequest).isFalse()
                sentSyncRequest = true
                activeStore.onProxyMessage(ProxyMessage.SyncRequest(id))
                return@ProxyCallback
            }

            assertThat(sentSyncRequest).isTrue()
            if (it is ProxyMessage.ModelUpdate) {
                it.model.values.assertEquals(entityCollection.data.values)
                job.complete()
                return@ProxyCallback
            }
            return@ProxyCallback
        })

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
        val id1 = activeStore.on(ProxyCallback {
            assertThat(it is ProxyMessage.ModelUpdate).isTrue()
            job.complete()
        })

        // another store
        var calledStore2 = false
        activeStore.on(
            ProxyCallback {
                calledStore2 = true
            }
        )

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
            .onProxyMessage(ProxyMessage.ModelUpdate(bobCrdt.data, id = 1), "an-id")

        val job = Job(coroutineContext[Job])
        activeStore.on(
            ProxyCallback {
                if (it is ProxyMessage.ModelUpdate) {
                    it.model.values.assertEquals(bobCollection.data.values)
                    job.complete()
                    return@ProxyCallback
                }
                job.completeExceptionally(AssertionError("Should have received model update."))
            }
        )

        val driver =
            activeStore.containerStore.driver as DatabaseDriver<CrdtSet.Data<Reference>>
        driver.receiver!!(referenceCollection.data, 1)
        job.join()
    }

    @Test
    fun resolvesACombination_ofMessages_fromProxy_andDriver() = runBlockingTest {
        val activeStore = createReferenceModeStore()

        val driver = activeStore.containerStore.driver as DatabaseDriver<CrdtSet.Data<Reference>>

        val e1 = createPersonEntity("e1", "e1", 1)
        val e2 = createPersonEntity("e2", "e2", 2)
        val e3 = createPersonEntity("e3", "e3", 3)

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
        referenceCollection.applyOperation(CrdtSet.Operation.Add(actor, VersionMap(actor to 1), ref))

        val job = Job(coroutineContext[Job])
        var backingStoreSent = false
        val id = activeStore.on(
            ProxyCallback {
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
        )

        val containerJob = launch {
            logRule("Sending to containerStore.onReceive")
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
            val backingStore = activeStore.backingStore.stores["an-id"]
                ?: activeStore.backingStore.setupStore("an-id")
            logRule("Sending to backingStore.onReceive")
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
            )
        )
    }

    private suspend fun createSingletonReferenceModeStore(): ReferenceModeStore {
        return ReferenceModeStore.create(
            StoreOptions(
                testKey,
                SingletonType(EntityType(schema))
            )
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
}
