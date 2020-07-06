package arcs.core.entity

import arcs.core.common.Id.Generator
import arcs.core.common.ReferenceId
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.data.Capability.Ttl
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.host.EntityHandleManager
import arcs.core.storage.ActivationFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreManager
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.testutil.waitUntilSet
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.testutil.handles.dispatchClear
import arcs.core.testutil.handles.dispatchCreateReference
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchIsEmpty
import arcs.core.testutil.handles.dispatchQuery
import arcs.core.testutil.handles.dispatchRemove
import arcs.core.testutil.handles.dispatchSize
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.Time
import arcs.jvm.util.testutil.FakeTime
import arcs.core.util.testutil.LogRule
import arcs.jvm.host.JvmSchedulerProvider
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull
import org.junit.Rule
import org.junit.Test
import arcs.core.storage.Reference as StorageReference

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
open class HandleManagerTestBase {
    @get:Rule
    val log = LogRule()

    init {
        SchemaRegistry.register(Person.SCHEMA)
        SchemaRegistry.register(Hat.SCHEMA)
    }

    private val backingKey = RamDiskStorageKey("entities")
    private val hatsBackingKey = RamDiskStorageKey("hats")
    protected lateinit var fakeTime: FakeTime

    private val entity1 = Person(
        entityId = "entity1",
        name = "Jason",
        age = 21.0,
        isCool = false,
        bestFriend = StorageReference("entity2", backingKey, null),
        hat = null,
        favoriteWords = listOf("coolio", "sasquatch", "indubitably")
    )
    private val entity2 = Person(
        entityId = "entity2",
        name = "Jason",
        age = 22.0,
        isCool = true,
        bestFriend = StorageReference("entity1", backingKey, null),
        hat = null,
        favoriteWords = listOf("wonderful", "exemplary", "yeet")
    )

    private val singletonRefKey = RamDiskStorageKey("single-ent")
    private val singletonKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = singletonRefKey
    )

    private val collectionRefKey = RamDiskStorageKey("set-ent")
    private val collectionKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = collectionRefKey
    )

    private val hatCollectionRefKey = RamDiskStorageKey("set-hats")
    private val hatCollectionKey = ReferenceModeStorageKey(
        backingKey = hatsBackingKey,
        storageKey = hatCollectionRefKey
    )

    var activationFactory: ActivationFactory? = null
    lateinit var schedulerProvider: JvmSchedulerProvider
    lateinit var readHandleManager: EntityHandleManager
    lateinit var writeHandleManager: EntityHandleManager
    lateinit var monitorHandleManager: EntityHandleManager
    var testTimeout: Long = 10000

    open var testRunner = { block: suspend CoroutineScope.() -> Unit ->
        monitorHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "monitorHost",
            time = fakeTime,
            scheduler = schedulerProvider("monitor"),
            stores = StoreManager(activationFactory)
        )
        runBlocking {
            withTimeout(testTimeout) { block() }
            monitorHandleManager.close()
            schedulerProvider.cancelAll()
        }
    }

    @Suppress("NON_APPLICABLE_CALL_FOR_BUILDER_INFERENCE")
    private var ramDiskActivity = callbackFlow {
        offer(Unit)
        val listener: (StorageKey, Any?) -> Unit = { _, _ -> offer(Unit) }
        RamDisk.addListener(listener)
        awaitClose { RamDisk.removeListener(listener) }
    }.debounce(500)

    // Must call from subclasses.
    open fun setUp() {
        // We need to initialize to -1 instead of the default (999999) because our test cases around
        // deleted items where we look for "nulled-out" entities can result in the
        // `UNINITIALIZED_TIMESTAMP` being used for creationTimestamp, and others can result in the
        // current time being used.
        // TODO: Determine why this is happening. It seems for a nulled-out entity, we shouldn't
        //  use the current time as the creationTimestamp.
        fakeTime = FakeTime(-1)
        DriverAndKeyConfigurator.configure(null)
        RamDisk.clear()
    }

    // Must call from subclasses
    open fun tearDown() = runBlocking<Unit> {
        // TODO(b/151366899): this is less than ideal - we should investigate how to make the entire
        //  test process cancellable/stoppable, even when we cross scopes into a BindingContext or
        //  over to other RamDisk listeners.
        readHandleManager.close()
        writeHandleManager.close()
        schedulerProvider.cancelAll()
        withTimeoutOrNull(5000) {
            ramDiskActivity.first()
        }
    }

    @Test
    fun singleton_initialStateAndSingleHandleOperations() = testRunner {
        val handle = writeHandleManager.createSingletonHandle()

        // Don't use the dispatchX helpers so we can test the immediate effect of the handle ops.
        withContext(handle.dispatcher) {
            // Initial state.
            assertThat(handle.fetch()).isNull()

            // Verify that clear works on an empty singleton.
            val jobs = mutableListOf<Job>()
            jobs.add(handle.clear())
            assertThat(handle.fetch()).isNull()

            // All handle ops should be locally immediate (no joins needed).
            jobs.add(handle.store(entity1))
            assertThat(handle.fetch()).isEqualTo(entity1)
            jobs.add(handle.clear())
            assertThat(handle.fetch()).isNull()

            // The joins should still work.
            jobs.joinAll()
        }
    }

    @Test
    fun singleton_writeAndReadBack_unidirectional() = testRunner {
        // Write-only handle -> read-only handle
        val writeHandle = writeHandleManager.createHandle(
            HandleSpec(
                "writeOnlySingleton",
                HandleMode.Write,
                SingletonType(EntityType(Person.SCHEMA)),
                Person
            ),
            singletonKey
        ).awaitReady() as WriteSingletonHandle<Person>

        val readHandle = readHandleManager.createHandle(
            HandleSpec(
                "readOnlySingleton",
                HandleMode.Read,
                SingletonType(EntityType(Person.SCHEMA)),
                Person
            ),
            singletonKey
        ).awaitReady() as ReadSingletonHandle<Person>

        var received = CompletableDeferred<Person?>()
        readHandle.onUpdate { received.complete(it) }

        // Verify store against empty.
        writeHandle.dispatchStore(entity1)
        assertThat(received.await()).isEqualTo(entity1)
        assertThat(readHandle.dispatchFetch()).isEqualTo(entity1)

        // Verify store overwrites existing.
        received = CompletableDeferred()
        writeHandle.dispatchStore(entity2)
        assertThat(received.await()).isEqualTo(entity2)
        assertThat(readHandle.dispatchFetch()).isEqualTo(entity2)

        // Verify clear.
        received = CompletableDeferred()
        writeHandle.dispatchClear()
        assertThat(received.await()).isNull()
        assertThat(readHandle.dispatchFetch()).isNull()
    }

    @Test
    fun singleton_writeAndReadBack_bidirectional() = testRunner {
        // Read/write handle <-> read/write handle
        val handle1 = writeHandleManager.createHandle(
            HandleSpec(
                "readWriteSingleton1",
                HandleMode.ReadWrite,
                SingletonType(EntityType(Person.SCHEMA)),
                Person
            ),
            singletonKey
        ).awaitReady() as ReadWriteSingletonHandle<Person>

        val handle2 = readHandleManager.createHandle(
            HandleSpec(
                "readWriteSingleton2",
                HandleMode.ReadWrite,
                SingletonType(EntityType(Person.SCHEMA)),
                Person
            ),
            singletonKey
        ).awaitReady() as ReadWriteSingletonHandle<Person>

        // handle1 -> handle2
        val received1to2 = CompletableDeferred<Person?>()
        handle2.onUpdate { received1to2.complete(it) }

        // Verify that handle2 sees the entity stored by handle1.
        handle1.dispatchStore(entity1)
        assertThat(received1to2.await()).isEqualTo(entity1)
        assertThat(handle2.dispatchFetch()).isEqualTo(entity1)

        // handle2 -> handle1
        var received2to1 = CompletableDeferred<Person?>()
        handle1.onUpdate { received2to1.complete(it) }

        // Verify that handle2 can clear the entity stored by handle1.
        handle2.dispatchClear()
        assertThat(received2to1.await()).isNull()
        assertThat(handle1.dispatchFetch()).isNull()

        // Verify that handle1 sees the entity stored by handle2.
        received2to1 = CompletableDeferred()
        handle2.dispatchStore(entity2)
        assertThat(received2to1.await()).isEqualTo(entity2)
        assertThat(handle1.dispatchFetch()).isEqualTo(entity2)
    }

    @Test
    fun singleton_dereferenceEntity() = testRunner {
        val writeHandle = writeHandleManager.createSingletonHandle()
        val readHandle = readHandleManager.createSingletonHandle()
        val readHandleUpdated = readHandle.onUpdateDeferred()
        writeHandle.dispatchStore(entity1)
        readHandleUpdated.await()
        log("Wrote entity1 to writeHandle")

        // Create a second handle for the second entity, so we can store it.
        val storageKey = ReferenceModeStorageKey(backingKey, RamDiskStorageKey("entity2"))
        val monitorRefHandle = monitorHandleManager.createSingletonHandle(storageKey, "monitor")
        val refWriteHandle = writeHandleManager.createSingletonHandle(storageKey, "otherWriteHandle")
        val refReadHandle = readHandleManager.createSingletonHandle(storageKey, "otherReadHandle")
        val monitorKnows = monitorRefHandle.onUpdateDeferred()
        val refReadKnows = refReadHandle.onUpdateDeferred()

        refWriteHandle.dispatchStore(entity2)
        monitorKnows.await()
        refReadKnows.await()

        // Now read back entity1, and dereference its best_friend.
        log("Checking entity1's best friend")
        val dereferencedRawEntity2 =
            readHandle.dispatchFetch()!!.bestFriend!!.dereference(coroutineContext)!!
        val dereferencedEntity2 = Person.deserialize(dereferencedRawEntity2)
        assertThat(dereferencedEntity2).isEqualTo(entity2)

        // Do the same for entity2's best_friend
        log("Checking entity2's best friend")
        val dereferencedRawEntity1 =
            refReadHandle.dispatchFetch()!!.bestFriend!!.dereference(coroutineContext)!!
        val dereferencedEntity1 = Person.deserialize(dereferencedRawEntity1)
        assertThat(dereferencedEntity1).isEqualTo(entity1)
    }

    @Test
    fun singleton_dereferenceEntity_nestedReference() = testRunner {
        // Create a stylish new hat, and create a reference to it.
        val hatCollection = writeHandleManager.createHandle(
            HandleSpec(
                "hatCollection",
                HandleMode.ReadWrite,
                CollectionType(EntityType(Hat.SCHEMA)),
                Hat
            ),
            hatCollectionKey
        ) as ReadWriteCollectionHandle<Hat>

        val fez = Hat(entityId = "fez-id", style = "fez")
        hatCollection.dispatchStore(fez)
        val fezRef = hatCollection.dispatchCreateReference(fez)
        val fezStorageRef = fezRef.toReferencable()

        // Give the hat to an entity and store it.
        val personWithHat = Person(
            entityId = "a-hatted-individual",
            name = "Jason",
            age = 25.0,
            isCool = true,
            bestFriend = null,
            hat = fezStorageRef,
            favoriteWords = listOf("Fez")
        )
        val writeHandle = writeHandleManager.createSingletonHandle()
        val readHandle = readHandleManager.createSingletonHandle()
        val readOnUpdate = readHandle.onUpdateDeferred()

        writeHandle.dispatchStore(personWithHat)

        RamDisk.waitUntilSet(fezStorageRef.referencedStorageKey())
        readOnUpdate.await()

        // Read out the entity, and fetch its hat.
        val entityOut = readHandle.dispatchFetch()!!
        val hatRef = entityOut.hat!!
        assertThat(hatRef).isEqualTo(fezStorageRef)
        val rawHat = hatRef.dereference(coroutineContext)!!
        val hat = Hat.deserialize(rawHat)
        assertThat(hat).isEqualTo(fez)
    }

    @Test
    fun singleton_noTTL() = testRunner {
        val handle = writeHandleManager.createSingletonHandle()
        val handleB = readHandleManager.createSingletonHandle()
        val handleBUpdated = handleB.onUpdateDeferred()

        val expectedCreateTime = 123456789L
        fakeTime.millis = expectedCreateTime

        handle.dispatchStore(entity1)
        handleBUpdated.await()

        val readBack = handleB.dispatchFetch()!!
        assertThat(readBack.creationTimestamp).isEqualTo(expectedCreateTime)
        assertThat(readBack.expirationTimestamp).isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
    }

    @Test
    fun singleton_withTTL() = testRunner {
        fakeTime.millis = 0
        val handle = writeHandleManager.createSingletonHandle(ttl = Ttl.Days(2))
        val handleB = readHandleManager.createSingletonHandle()

        var handleBUpdated = handleB.onUpdateDeferred()
        handle.dispatchStore(entity1)
        handleBUpdated.await()

        val readBack = handleB.dispatchFetch()!!
        assertThat(readBack.creationTimestamp).isEqualTo(0)
        assertThat(readBack.expirationTimestamp).isEqualTo(2*24*3600*1000)

        val handleC = readHandleManager.createSingletonHandle(ttl = Ttl.Minutes(2))
        handleBUpdated = handleB.onUpdateDeferred()
        handleC.dispatchStore(entity2)
        handleBUpdated.await()

        val readBack2 = handleB.dispatchFetch()!!
        assertThat(readBack2.creationTimestamp).isEqualTo(0)
        assertThat(readBack2.expirationTimestamp).isEqualTo(2*60*1000)

        // Fast forward time to 5 minutes later, so entity2 expires.
        fakeTime.millis += 5*60*1000
        assertThat(handleB.dispatchFetch()).isNull()
    }

    @Test
    fun referenceSingleton_withTtl() = testRunner {
        fakeTime.millis = 0
        // Create and store an entity with no TTL.
        val entityHandle = writeHandleManager.createSingletonHandle()
        val refHandle = writeHandleManager.createReferenceSingletonHandle(ttl = Ttl.Minutes(2))
        val updated = entityHandle.onUpdateDeferred()
        entityHandle.dispatchStore(entity1)
        updated.await()

        // Create and store a reference with TTL.
        val entity1Ref = entityHandle.dispatchCreateReference(entity1)
        refHandle.dispatchStore(entity1Ref)
        val readBack = refHandle.dispatchFetch()!!
        assertThat(readBack.creationTimestamp).isEqualTo(0)
        assertThat(readBack.expirationTimestamp).isEqualTo(2 * 60 * 1000)

        // Fast forward time to 5 minutes later, so the reference expires.
        fakeTime.millis += 5 * 60 * 1000
        assertThat(refHandle.dispatchFetch()).isNull()
    }

    @Test
    fun singleton_referenceLiveness() = testRunner {
        // Create and store an entity.
        val writeEntityHandle = writeHandleManager.createCollectionHandle()
        val monitorHandle = monitorHandleManager.createCollectionHandle()
        val initialEntityStored = monitorHandle.onUpdateDeferred { it.size == 1 }
        writeEntityHandle.dispatchStore(entity1)
        initialEntityStored.await()
        log("Created and stored an entity")

        // Create and store a reference to the entity.
        val entity1Ref = writeEntityHandle.dispatchCreateReference(entity1)
        val writeRefHandle = writeHandleManager.createReferenceSingletonHandle()
        val readRefHandle = readHandleManager.createReferenceSingletonHandle()
        val refHeard = readRefHandle.onUpdateDeferred()
        writeRefHandle.dispatchStore(entity1Ref)
        log("Created and stored a reference")

        RamDisk.waitUntilSet(entity1Ref.toReferencable().referencedStorageKey())
        refHeard.await()

        // Now read back the reference from a different handle.
        var reference = readRefHandle.dispatchFetch()!!
        assertThat(reference).isEqualTo(entity1Ref)

        // Reference should be alive.
        assertThat(reference.dereference()).isEqualTo(entity1)
        var storageReference = reference.toReferencable()
        assertThat(storageReference.isAlive(coroutineContext)).isTrue()
        assertThat(storageReference.isDead(coroutineContext)).isFalse()

        // Modify the entity.
        val modEntity1 = entity1.copy(name = "Ben")
        val entityModified = monitorHandle.onUpdateDeferred {
            it.all { person -> person.name == "Ben" }
        }
        writeEntityHandle.dispatchStore(modEntity1)
        assertThat(writeEntityHandle.dispatchSize()).isEqualTo(1)
        entityModified.await()

        // Reference should still be alive.
        reference = readRefHandle.dispatchFetch()!!
        val dereferenced = reference.dereference()
        log("Dereferenced: $dereferenced")
        assertThat(dereferenced).isEqualTo(modEntity1)
        storageReference = reference.toReferencable()
        assertThat(storageReference.isAlive(coroutineContext)).isTrue()
        assertThat(storageReference.isDead(coroutineContext)).isFalse()

        // Remove the entity from the collection.
        val heardTheDelete = monitorHandle.onUpdateDeferred { it.isEmpty() }
        writeEntityHandle.dispatchRemove(entity1)
        heardTheDelete.await()

        // Reference should be dead. (Removed entities currently aren't actually deleted, but
        // instead are "nulled out".)
        assertThat(storageReference.dereference()).isEqualTo(createNulledOutPerson("entity1"))
    }

    @Test
    fun singleton_referenceHandle_referenceModeNotSupported() = testRunner {
        val e = assertSuspendingThrows(IllegalArgumentException::class) {
            writeHandleManager.createReferenceSingletonHandle(
                ReferenceModeStorageKey(
                    backingKey = backingKey,
                    storageKey = singletonRefKey
                )
            )
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Reference-mode storage keys are not supported for reference-typed handles."
        )
    }

    @Test
    fun collection_initialStateAndSingleHandleOperations() = testRunner {
        val handle = writeHandleManager.createCollectionHandle()

        // Don't use the dispatchX helpers so we can test the immediate effect of the handle ops.
        withContext(handle.dispatcher) {
            // Initial state.
            assertThat(handle.size()).isEqualTo(0)
            assertThat(handle.isEmpty()).isEqualTo(true)
            assertThat(handle.fetchAll()).isEmpty()

            // Verify that both clear and removing a random entity with an empty collection are ok.
            val jobs = mutableListOf<Job>()
            jobs.add(handle.clear())
            jobs.add(handle.remove(entity1))

            // All handle ops should be locally immediate (no joins needed).
            jobs.add(handle.store(entity1))
            jobs.add(handle.store(entity2))
            assertThat(handle.size()).isEqualTo(2)
            assertThat(handle.isEmpty()).isEqualTo(false)
            assertThat(handle.fetchAll()).containsExactly(entity1, entity2)

            jobs.add(handle.remove(entity1))
            assertThat(handle.size()).isEqualTo(1)
            assertThat(handle.isEmpty()).isEqualTo(false)
            assertThat(handle.fetchAll()).containsExactly(entity2)

            jobs.add(handle.clear())
            assertThat(handle.size()).isEqualTo(0)
            assertThat(handle.isEmpty()).isEqualTo(true)
            assertThat(handle.fetchAll()).isEmpty()

            // The joins should still work.
            jobs.joinAll()
        }
    }

    @Test
    fun collection_writeAndReadBack_unidirectional() = testRunner {
        // Write-only handle -> read-only handle
        val writeHandle = writeHandleManager.createHandle(
            HandleSpec(
                "writeOnlyCollection",
                HandleMode.Write,
                CollectionType(EntityType(Person.SCHEMA)),
                Person
            ),
            collectionKey
        ).awaitReady() as WriteCollectionHandle<Person>

        val readHandle = readHandleManager.createHandle(
            HandleSpec(
                "readOnlyCollection",
                HandleMode.Read,
                CollectionType(EntityType(Person.SCHEMA)),
                Person
            ),
            collectionKey
        ).awaitReady() as ReadCollectionHandle<Person>

        val entity3 = Person("entity3", "Wanda", 60.0, true)

        var received = Job()
        var size = 3
        readHandle.onUpdate { if (it.size == size) received.complete() }

        // Verify store.
        writeHandle.dispatchStore(entity1, entity2, entity3)
        received.join()
        assertThat(readHandle.dispatchSize()).isEqualTo(3)
        assertThat(readHandle.dispatchIsEmpty()).isEqualTo(false)
        assertThat(readHandle.dispatchFetchAll()).containsExactly(entity1, entity2, entity3)

        // Verify remove.
        received = Job()
        size = 2
        writeHandle.dispatchRemove(entity2)
        received.join()
        assertThat(readHandle.dispatchSize()).isEqualTo(2)
        assertThat(readHandle.dispatchIsEmpty()).isEqualTo(false)
        assertThat(readHandle.dispatchFetchAll()).containsExactly(entity1, entity3)

        // Verify clear.
        received = Job()
        size = 0
        writeHandle.dispatchClear()
        received.join()
        assertThat(readHandle.dispatchSize()).isEqualTo(0)
        assertThat(readHandle.dispatchIsEmpty()).isEqualTo(true)
        assertThat(readHandle.dispatchFetchAll()).isEmpty()
    }

    @Test
    fun collection_writeAndReadBack_bidirectional() = testRunner {
        // Read/write handle <-> read/write handle
        val handle1 = writeHandleManager.createHandle(
            HandleSpec(
                "readWriteCollection1",
                HandleMode.ReadWrite,
                CollectionType(EntityType(Person.SCHEMA)),
                Person
            ),
            collectionKey
        ).awaitReady() as ReadWriteCollectionHandle<Person>

        val handle2 = readHandleManager.createHandle(
            HandleSpec(
                "readWriteCollection2",
                HandleMode.ReadWrite,
                CollectionType(EntityType(Person.SCHEMA)),
                Person
            ),
            collectionKey
        ).awaitReady() as ReadWriteCollectionHandle<Person>

        val entity3 = Person("entity3", "William", 35.0, false)

        // handle1 -> handle2
        val received1to2 = CompletableDeferred<Set<Person>>()
        handle2.onUpdate { if (it.size == 3) received1to2.complete(it) }

        // Verify that handle2 sees entities stored by handle1.
        handle1.dispatchStore(entity1, entity2, entity3)
        assertThat(received1to2.await()).containsExactly(entity1, entity2, entity3)
        assertThat(handle2.dispatchSize()).isEqualTo(3)
        assertThat(handle2.dispatchIsEmpty()).isEqualTo(false)
        assertThat(handle2.dispatchFetchAll()).containsExactly(entity1, entity2, entity3)

        // handle2 -> handle1
        var received2to1 = CompletableDeferred<Set<Person>>()
        var size2to1 = 2
        handle1.onUpdate { if (it.size == size2to1) received2to1.complete(it) }

        // Verify that handle2 can remove entities stored by handle1.
        handle2.dispatchRemove(entity2)
        assertThat(received2to1.await()).containsExactly(entity1, entity3)
        assertThat(handle1.dispatchSize()).isEqualTo(2)
        assertThat(handle1.dispatchIsEmpty()).isEqualTo(false)
        assertThat(handle1.dispatchFetchAll()).containsExactly(entity1, entity3)

        // Verify that handle1 sees an empty collection after a clear op from handle2.
        received2to1 = CompletableDeferred()
        size2to1 = 0
        handle2.dispatchClear()
        assertThat(received2to1.await()).isEmpty()
        assertThat(handle1.dispatchSize()).isEqualTo(0)
        assertThat(handle1.dispatchIsEmpty()).isEqualTo(true)
        assertThat(handle1.dispatchFetchAll()).isEmpty()
    }

    @Test
    fun collection_writeMutatedEntityReplaces() = testRunner {
        val entity = TestParticle_Entities(text = "Hello")
        val handle = writeHandleManager.createCollectionHandle(entitySpec = TestParticle_Entities)
        handle.dispatchStore(entity)
        assertThat(handle.dispatchFetchAll()).containsExactly(entity)

        val modified = entity.mutate(text = "Changed")
        assertThat(modified).isNotEqualTo(entity)

        // Entity internals should not change.
        assertThat(modified.entityId).isEqualTo(entity.entityId)
        assertThat(modified.creationTimestamp).isEqualTo(entity.creationTimestamp)
        assertThat(modified.expirationTimestamp).isEqualTo(entity.expirationTimestamp)

        handle.dispatchStore(modified)
        assertThat(handle.dispatchFetchAll()).containsExactly(modified)
    }

    @Test
    fun listsWorkEndToEnd() = testRunner {
        val entity = TestParticle_Entities(text = "Hello", number = 1.0, list = listOf(1L, 2L, 4L, 2L))
        val writeHandle = writeHandleManager.createCollectionHandle(entitySpec = TestParticle_Entities)
        val readHandle = readHandleManager.createCollectionHandle(entitySpec = TestParticle_Entities)

        val updateDeferred = readHandle.onUpdateDeferred { it.size == 1 }
        writeHandle.dispatchStore(entity)
        assertThat(updateDeferred.await()).containsExactly(entity)
    }

    @Test
    fun clientCanSetEntityId() = testRunner {
        fakeTime.millis = 0
        // Ask faketime to increment to test with changing timestamps.
        fakeTime.autoincrement = 1
        val id = "MyId"
        val entity = TestParticle_Entities(text = "Hello", number = 1.0, entityId = id)
        val handle = writeHandleManager.createCollectionHandle(entitySpec = TestParticle_Entities)
        handle.dispatchStore(entity)
        assertThat(handle.dispatchFetchAll()).containsExactly(entity)

        // A different entity, with the same ID, should replace the first.
        val entity2 = TestParticle_Entities(text = "New Hello", number = 1.1, entityId = id)
        handle.dispatchStore(entity2)
        assertThat(handle.dispatchFetchAll()).containsExactly(entity2)
        // Timestamps also get updated.
        assertThat(entity2.creationTimestamp).isEqualTo(2)

        // An entity with a different ID.
        val entity3 = TestParticle_Entities(text = "Bye", number = 2.0, entityId = "OtherId")
        handle.dispatchStore(entity3)
        assertThat(handle.dispatchFetchAll()).containsExactly(entity3, entity2)
    }

    @Test
    fun clientCanSetCreationTimestamp() = testRunner {
        fakeTime.millis = 100
        val creationTime = 20L
        val entity = TestParticle_Entities(text = "Hello", number = 1.0, creationTimestamp = creationTime)
        val handle = writeHandleManager.createCollectionHandle(entitySpec = TestParticle_Entities)
        handle.dispatchStore(entity)

        assertThat(handle.dispatchFetchAll()).containsExactly(entity)
        assertThat(entity.creationTimestamp).isEqualTo(20)

        // A different entity that reuses the same creation timestamp.
        val entity2 = TestParticle_Entities(
            text = "New Hello",
            number = 1.1,
            creationTimestamp = entity.creationTimestamp
        )
        handle.dispatchStore(entity2)

        assertThat(handle.dispatchFetchAll()).containsExactly(entity, entity2)
        assertThat(entity2.creationTimestamp).isEqualTo(20)
    }

    @Test
    fun collection_entityDereference() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()
        val readHandle = readHandleManager.createCollectionHandle()
        val monitorHandle = monitorHandleManager.createCollectionHandle()
        val monitorInitialized = monitorHandle.onUpdateDeferred { it.size == 2 }
        val readUpdated = readHandle.onUpdateDeferred { it.size == 2 }

        writeHandle.dispatchStore(entity1, entity2)
        log("wrote entity1 and entity2 to writeHandle")

        monitorInitialized.await()
        readUpdated.await()
        log("readHandle and the ramDisk have heard of the update")

        readHandle.dispatchFetchAll()
            .also { assertThat(it).hasSize(2) }
            .forEach { entity ->
                val expectedBestFriend = if (entity.entityId == "entity1") entity2 else entity1
                val actualRawBestFriend = entity.bestFriend!!.dereference(coroutineContext)!!
                val actualBestFriend = Person.deserialize(actualRawBestFriend)
                assertThat(actualBestFriend).isEqualTo(expectedBestFriend)
            }
    }

    @Test
    fun collection_dereferenceEntity_nestedReference() = testRunner {
        // Create a stylish new hat, and create a reference to it.
        val hatSpec = HandleSpec(
            "hatCollection",
            HandleMode.ReadWrite,
            CollectionType(EntityType(Hat.SCHEMA)),
            Hat
        )
        val hatCollection = writeHandleManager.createHandle(
            hatSpec,
            hatCollectionKey
        ).awaitReady() as ReadWriteCollectionHandle<Hat>
        val hatMonitor = monitorHandleManager.createHandle(
            hatSpec,
            hatCollectionKey
        ).awaitReady() as ReadWriteCollectionHandle<Hat>
        val writeHandle = writeHandleManager.createCollectionHandle()
        val readHandle = readHandleManager.createCollectionHandle()

        val fez = Hat(entityId = "fez-id", style = "fez")
        val hatMonitorKnows = hatMonitor.onUpdateDeferred {
            it.find { hat -> hat.entityId == "fez-id" } != null
        }
        hatCollection.dispatchStore(fez)
        val fezRef = hatCollection.dispatchCreateReference(fez)
        val fezStorageRef = fezRef.toReferencable()

        // Give the hat to an entity and store it.
        val personWithHat = Person(
            entityId = "a-hatted-individual",
            name = "Jason",
            age = 25.0,
            isCool = true,
            bestFriend = null,
            hat = fezStorageRef
        )
        val readHandleKnows = readHandle.onUpdateDeferred {
            it.find { person -> person.entityId == "a-hatted-individual" } != null
        }
        writeHandle.dispatchStore(personWithHat)

        // Read out the entity, and fetch its hat.
        readHandleKnows.await()
        val entityOut = readHandle.dispatchFetchAll().single {
            it.entityId == "a-hatted-individual"
        }
        val hatRef = entityOut.hat!!
        assertThat(hatRef).isEqualTo(fezStorageRef)

        hatMonitorKnows.await()
        val rawHat = hatRef.dereference(coroutineContext)!!
        val hat = Hat.deserialize(rawHat)
        assertThat(hat).isEqualTo(fez)
    }

    @Test
    fun collection_noTTL() = testRunner {
        val monitor = monitorHandleManager.createCollectionHandle()
        val handle = writeHandleManager.createCollectionHandle()
        val handleB = readHandleManager.createCollectionHandle()
        val handleBChanged = handleB.onUpdateDeferred()
        val monitorNotified = monitor.onUpdateDeferred()

        val expectedCreateTime = 123456789L
        fakeTime.millis = expectedCreateTime

        handle.dispatchStore(entity1)
        monitorNotified.await()
        handleBChanged.await()

        val readBack = handleB.dispatchFetchAll().first { it.entityId == entity1.entityId }
        assertThat(readBack.creationTimestamp).isEqualTo(expectedCreateTime)
        assertThat(readBack.expirationTimestamp).isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
    }

    @Test
    fun collection_withTTL() = testRunner {
        fakeTime.millis = 0
        val handle = writeHandleManager.createCollectionHandle(ttl = Ttl.Days(2))
        val handleB = readHandleManager.createCollectionHandle()
        var handleBChanged = handleB.onUpdateDeferred()
        handle.dispatchStore(entity1)
        handleBChanged.await()

        val readBack = handleB.dispatchFetchAll().first { it.entityId == entity1.entityId }
        assertThat(readBack.creationTimestamp).isEqualTo(0)
        assertThat(readBack.expirationTimestamp).isEqualTo(2*24*3600*1000)

        val handleC = readHandleManager.createCollectionHandle(ttl = Ttl.Minutes(2))
        handleBChanged = handleB.onUpdateDeferred()
        handleC.dispatchStore(entity2)
        handleBChanged.await()
        val readBack2 = handleB.dispatchFetchAll().first { it.entityId == entity2.entityId }
        assertThat(readBack2.creationTimestamp).isEqualTo(0)
        assertThat(readBack2.expirationTimestamp).isEqualTo(2*60*1000)

        // Fast forward time to 5 minutes later, so entity2 expires, entity1 doesn't.
        fakeTime.millis += 5*60*1000
        assertThat(handleB.dispatchSize()).isEqualTo(1)
        assertThat(handleB.dispatchFetchAll()).containsExactly(entity1)
    }

    @Test
    fun referenceCollection_withTtl() = testRunner {
        fakeTime.millis = 0
        val entityHandle = writeHandleManager.createCollectionHandle()
        val refHandle = writeHandleManager.createReferenceCollectionHandle(ttl = Ttl.Minutes(2))

        // Create and store an entity with no TTL.
        val updated = entityHandle.onUpdateDeferred()
        entityHandle.dispatchStore(entity1)
        updated.await()

        // Create and store a reference with TTL.
        val entity1Ref = entityHandle.dispatchCreateReference(entity1)
        refHandle.dispatchStore(entity1Ref)
        val readBack = refHandle.dispatchFetchAll().first()
        assertThat(readBack.creationTimestamp).isEqualTo(0)
        assertThat(readBack.expirationTimestamp).isEqualTo(2 * 60 * 1000)

        // Fast forward time to 5 minutes later, so the reference expires.
        fakeTime.millis += 5 * 60 * 1000
        assertThat(refHandle.dispatchFetchAll()).isEmpty()
        assertThat(refHandle.dispatchSize()).isEqualTo(0)
    }

    @Test
    fun collection_addingToA_showsUpInQueryOnB() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()
        val readHandle = readHandleManager.createCollectionHandle()

        val readUpdatedTwice = readHandle.onUpdateDeferred {
            log("B.onUpdate(${it.map(Person::entityId)})")
            it.size == 2
        }

        log("Writing entities to A")
        writeHandle.dispatchStore(entity1, entity2)

        log("Waiting for entities on B")
        readUpdatedTwice.await()

        // Ensure that the query argument is being used.
        assertThat(readHandle.dispatchQuery(21.0)).containsExactly(entity1)
        assertThat(readHandle.dispatchQuery(22.0)).containsExactly(entity2)

        // Ensure that an empty set of results can be returned.
        assertThat(readHandle.dispatchQuery(60.0)).isEmpty()
    }

    @Test
    fun collection_dataConsideredInvalidByRefinementThrows() = testRunner {
        val timeTraveler = Person("doctor1", "the Doctor", -900.0, false, null, null)
        val handle = writeHandleManager.createCollectionHandle()
        handle.dispatchStore(entity1, entity2)

        assertThat(handle.dispatchFetchAll()).containsExactly(entity1, entity2)

        assertSuspendingThrows(IllegalArgumentException::class) {
            handle.dispatchStore(timeTraveler)
        }
    }

    @Test
    fun collection_queryWithInvalidQueryThrows() = testRunner {
        val handle = writeHandleManager.createCollectionHandle()
        handle.dispatchStore(entity1, entity2)

        assertThat(handle.dispatchFetchAll()).containsExactly(entity1, entity2)
        // Ensure that queries can be performed.
        (handle as ReadWriteQueryCollectionHandle<Person, Double>).dispatchQuery(44.0)
        // Ensure that queries can be performed.
        assertSuspendingThrows(ClassCastException::class) {
            (handle as ReadWriteQueryCollectionHandle<Person, String>).dispatchQuery("44")
        }
    }

    @Test
    fun collection_referenceLiveness() = testRunner {
        // Create and store some entities.
        val writeEntityHandle = writeHandleManager.createCollectionHandle()
        val monitorHandle = monitorHandleManager.createCollectionHandle()
        monitorHandle.onUpdate {
            log("Monitor Handle: $it")
        }
        val monitorSawEntities = monitorHandle.onUpdateDeferred {
            log("First batch of entities - so far: $it")
            it.size == 2
        }
        writeEntityHandle.dispatchStore(entity1,entity2)

        // Wait for the monitor to see the entities (monitor handle is on a separate storage proxy
        // with a separate stores-cache, so it requires the entities to have made it to the storage
        // media.
        monitorSawEntities.await()

        // Create a store a reference to the entity.
        val entity1Ref = writeEntityHandle.dispatchCreateReference(entity1)
        val entity2Ref = writeEntityHandle.dispatchCreateReference(entity2)
        val writeRefHandle = writeHandleManager.createReferenceCollectionHandle()
        val readRefHandle = readHandleManager.createReferenceCollectionHandle()
        val refWritesHappened = readRefHandle.onUpdateDeferred {
            log("References created so far: $it")
            it.size == 2
        }
        writeRefHandle.dispatchStore(entity1Ref, entity2Ref)

        // Now read back the references from a different handle.
        refWritesHappened.await()
        var references = readRefHandle.dispatchFetchAll()
        assertThat(references).containsExactly(entity1Ref, entity2Ref)

        // References should be alive.
        assertThat(references.map { it.dereference() }).containsExactly(entity1, entity2)
        references.forEach {
            val storageReference = it.toReferencable()
            assertThat(storageReference.isAlive(coroutineContext)).isTrue()
            assertThat(storageReference.isDead(coroutineContext)).isFalse()
        }

        // Modify the entities.
        val modEntity1 = entity1.copy(name = "Ben")
        val modEntity2 = entity2.copy(name = "Ben")
        val entitiesWritten = monitorHandle.onUpdateDeferred {
            log("Heard update with $it")
            it.all { person -> person.name == "Ben" }
        }
        writeEntityHandle.dispatchStore(modEntity1, modEntity2)
        entitiesWritten.await()

        // Reference should still be alive.
        references = readRefHandle.dispatchFetchAll()
        assertThat(references.map { it.dereference() }).containsExactly(modEntity1, modEntity2)
        references.forEach {
            val storageReference = it.toReferencable()
            assertThat(storageReference.isAlive(coroutineContext)).isTrue()
            assertThat(storageReference.isDead(coroutineContext)).isFalse()
        }

        log("Removing the entities")

        // Remove the entities from the collection.
        val entitiesDeleted = monitorHandle.onUpdateDeferred { it.isEmpty() }
        writeEntityHandle.dispatchRemove(entity1, entity2)
        entitiesDeleted.await()

        log("Checking that they are empty when de-referencing.")

        // Reference should be dead. (Removed entities currently aren't actually deleted, but
        // instead are "nulled out".)
        assertThat(references.map { it.toReferencable().dereference() }).containsExactly(
            createNulledOutPerson("entity1"),
            createNulledOutPerson("entity2")
        )
    }

    @Test
    fun collection_referenceHandle_referenceModeNotSupported() = testRunner {
        val e = assertSuspendingThrows(IllegalArgumentException::class) {
            writeHandleManager.createReferenceCollectionHandle(
                ReferenceModeStorageKey(
                    backingKey = backingKey,
                    storageKey = collectionRefKey
                )
            )
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Reference-mode storage keys are not supported for reference-typed handles."
        )
    }

    private suspend fun EntityHandleManager.createSingletonHandle(
        storageKey: StorageKey = singletonKey,
        name: String = "singletonWriteHandle",
        ttl: Ttl = Ttl.Infinite()
    ) = createHandle(
        HandleSpec(
            name,
            HandleMode.ReadWrite,
            SingletonType(EntityType(Person.SCHEMA)),
            Person
        ),
        storageKey,
        ttl
    ).awaitReady() as ReadWriteSingletonHandle<Person>

    private suspend fun EntityHandleManager.createCollectionHandle(
        storageKey: StorageKey = collectionKey,
        name: String = "collectionReadHandle",
        ttl: Ttl = Ttl.Infinite()
    ) = createCollectionHandle(storageKey, name, ttl, Person)

    private suspend fun <T : Entity> EntityHandleManager.createCollectionHandle(
        storageKey: StorageKey = collectionKey,
        name: String = "collectionReadHandle",
        ttl: Ttl = Ttl.Infinite(),
        entitySpec: EntitySpec<T>
    ) = createHandle(
        HandleSpec(
            name,
            HandleMode.ReadWriteQuery,
            CollectionType(EntityType(entitySpec.SCHEMA)),
            entitySpec
        ),
        storageKey,
        ttl
    ).awaitReady() as ReadWriteQueryCollectionHandle<T, Any>

    private suspend fun EntityHandleManager.createReferenceSingletonHandle(
        storageKey: StorageKey = singletonRefKey,
        name: String = "referenceSingletonWriteHandle",
        ttl: Ttl = Ttl.Infinite()
    ) = createHandle(
        HandleSpec(
            name,
            HandleMode.ReadWrite,
            SingletonType(ReferenceType(EntityType(Person.SCHEMA))),
            Person
        ),
        storageKey,
        ttl
    ).awaitReady() as ReadWriteSingletonHandle<Reference<Person>>

    private suspend fun EntityHandleManager.createReferenceCollectionHandle(
        storageKey: StorageKey = collectionRefKey,
        name: String = "referenceCollectionReadHandle",
        ttl: Ttl = Ttl.Infinite()
    ) = createHandle(
        HandleSpec(
            name,
            HandleMode.ReadWriteQuery,
            CollectionType(ReferenceType(EntityType(Person.SCHEMA))),
            Person
        ),
        storageKey,
        ttl
    ).also { it.awaitReady() } as ReadWriteQueryCollectionHandle<Reference<Person>, Any>

    private fun <T> ReadableHandle<T>.onUpdateDeferred(
        predicate: (T) -> Boolean = { true }
    ): Deferred<T> = CompletableDeferred<T>().also { deferred ->
        onUpdate {
            if (deferred.isActive && predicate(it)) {
                deferred.complete(it)
            }
        }
    }

    private fun createNulledOutPerson(entityId: ReferenceId) = RawEntity(
        id = entityId,
        singletons = mapOf(
            "name" to null,
            "age" to null,
            "is_cool" to null,
            "best_friend" to null,
            "hat" to null,
            "favorite_words" to null
        ),
        collections = emptyMap(),
        creationTimestamp = RawEntity.UNINITIALIZED_TIMESTAMP,
        expirationTimestamp = RawEntity.UNINITIALIZED_TIMESTAMP
    )

    data class CoolnessIndex(
        override val entityId: ReferenceId,
        val pairsOfShoesOwned: Int,
        val isCool: Boolean,
        val hat: StorageReference? = null
    ) : Entity {
        var raw: RawEntity? = null
        override var creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
        override var expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP

        override fun ensureEntityFields(
            idGenerator: Generator,
            handleName: String,
            time: Time,
            ttl: Ttl
        ) {
            creationTimestamp = time.currentTimeMillis
            if (ttl != Ttl.Infinite()) {
                expirationTimestamp = ttl.calculateExpiration(time)
            }
        }

        override fun serialize() = RawEntity(
            entityId,
            mapOf(
                "pairs_of_shoes_owned" to pairsOfShoesOwned.toReferencable(),
                "is_cool" to isCool.toReferencable(),
                "hat" to hat
            ),
            emptyMap(),
            creationTimestamp,
            expirationTimestamp
        )

        override fun reset() = throw NotImplementedError()

        companion object : EntitySpec<CoolnessIndex> {
            @Suppress("UNCHECKED_CAST")
            override fun deserialize(data: RawEntity) = CoolnessIndex(
                entityId = data.id,
                pairsOfShoesOwned = (data.singletons["pairs_of_shoes_owned"] as ReferencablePrimitive<Int>).value,
                isCool = (data.singletons["is_cool"] as ReferencablePrimitive<Boolean>).value,
                hat = data.singletons["hat"] as? StorageReference
            ).apply {
                raw = data
                creationTimestamp = data.creationTimestamp
                expirationTimestamp = data.expirationTimestamp
            }

            override val SCHEMA = Schema(
                setOf(SchemaName("Person")),
                SchemaFields(
                    singletons = mapOf(
                        "pairs_of_shoes_owned" to FieldType.Int,
                        "is_cool" to FieldType.Boolean,
                        "hat" to FieldType.EntityRef("hat-hash")
                    ),
                    collections = emptyMap()
                ),
                "coolness-index-hash"
            )
        }
    }

    data class Person(
        override val entityId: ReferenceId,
        val name: String,
        val age: Double,
        val bestFriend: StorageReference? = null,
        val favoriteWords: List<String> = listOf(),
        val coolnessIndex: CoolnessIndex
    ) : Entity {

        var raw: RawEntity? = null
        override var creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
        override var expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP

        override fun ensureEntityFields(
            idGenerator: Generator,
            handleName: String,
            time: Time,
            ttl: Ttl
        ) {
            creationTimestamp = time.currentTimeMillis
            if (ttl != Ttl.Infinite()) {
                expirationTimestamp = ttl.calculateExpiration(time)
            }
        }

        override fun serialize() = RawEntity(
            entityId,
            singletons = mapOf(
                "name" to name.toReferencable(),
                "age" to age.toReferencable(),
                "best_friend" to bestFriend,
                "favorite_words" to favoriteWords.map { it.toReferencable() }.toReferencable(FieldType.ListOf(FieldType.Text)),
                "coolness_index" to coolnessIndex.serialize()
            ),
            collections = emptyMap(),
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp
        )

        override fun reset() = throw NotImplementedError()

        companion object : EntitySpec<Person> {

            private val queryByAge = { value: RawEntity, args: Any ->
                value.singletons["age"].toPrimitiveValue(Double::class, 0.0) == (args as Double)
            }

            private val refinementAgeGtZero = { value: RawEntity ->
                value.singletons["age"].toPrimitiveValue(Double::class, 0.0) > 0
            }

            @Suppress("UNCHECKED_CAST")
            override fun deserialize(data: RawEntity) = Person(
                entityId = data.id,
                name = (data.singletons["name"] as ReferencablePrimitive<String>).value,
                age = (data.singletons["age"] as ReferencablePrimitive<Double>).value,
                bestFriend = data.singletons["best_friend"] as? StorageReference,
                favoriteWords = (data.singletons["favorite_words"] as ReferencableList<*>).value.map {
                    (it as ReferencablePrimitive<String>).value
                },
                coolnessIndex = CoolnessIndex.deserialize(data.singletons["coolness_index"] as RawEntity)
            ).apply {
                raw = data
                creationTimestamp = data.creationTimestamp
                expirationTimestamp = data.expirationTimestamp
            }

            override val SCHEMA = Schema(
                setOf(SchemaName("Person")),
                SchemaFields(
                    singletons = mapOf(
                        "name" to FieldType.Text,
                        "age" to FieldType.Number,
                        "best_friend" to FieldType.EntityRef("person-hash"),
                        "favorite_words" to FieldType.ListOf(FieldType.Text),
                        "coolness_index" to FieldType.InlineEntity("coolness-index-hash")
                    ),
                    collections = emptyMap()
                ),
                "person-hash",
                query = queryByAge,
                refinement = refinementAgeGtZero
            )
        }
    }

    data class Hat(
        override val entityId: ReferenceId,
        val style: String
    ) : Entity {
        override var creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
        override var expirationTimestamp : Long = RawEntity.UNINITIALIZED_TIMESTAMP

        override fun ensureEntityFields(
            idGenerator: Generator,
            handleName: String,
            time: Time,
            ttl: Ttl
        ) = Unit

        override fun serialize() = RawEntity(
            entityId,
            singletons = mapOf(
                "style" to style.toReferencable()
            ),
            collections = emptyMap()
        )

        override fun reset() = throw NotImplementedError()

        companion object : EntitySpec<Entity> {
            override fun deserialize(data: RawEntity) = Hat(
                entityId = data.id,
                style = (data.singletons["style"] as ReferencablePrimitive<String>).value
            )

            override val SCHEMA = Schema(
                setOf(SchemaName("Hat")),
                SchemaFields(
                    singletons = mapOf("style" to FieldType.Text),
                    collections = emptyMap()
                ),
                "hat-hash"
            )
        }
    }
}
