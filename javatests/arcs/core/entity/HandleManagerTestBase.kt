package arcs.core.entity

import arcs.core.common.Id.Generator
import arcs.core.common.ReferenceId
import arcs.core.data.FieldType
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.Ttl
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.util.Time
import arcs.jvm.util.testutil.FakeTime
import arcs.core.util.testutil.LogRule
import arcs.jvm.host.JvmSchedulerProvider
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Job
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import arcs.core.storage.Reference as StorageReference

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
open class HandleManagerTestBase {
    @get:Rule
    val log = LogRule()

    init {
        SchemaRegistry.register(Person)
        SchemaRegistry.register(Hat)
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
        hat = null
    )
    private val entity2 = Person(
        entityId = "entity2",
        name = "Jason",
        age = 22.0,
        isCool = true,
        bestFriend = StorageReference("entity1", backingKey, null),
        hat = null
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

    lateinit var schedulerProvider: JvmSchedulerProvider
    lateinit var readHandleManager: EntityHandleManager
    lateinit var writeHandleManager: EntityHandleManager

    open var testRunner = { block: suspend CoroutineScope.() -> Unit ->
        runBlocking {
            this.block()
            schedulerProvider.cancelAll()
        }
    }

    // Must call from subclasses.
    open fun setUp() {
        fakeTime = FakeTime()
        DriverAndKeyConfigurator.configure(null)
        RamDisk.clear()
    }

    // Must call from subclasses
    open fun tearDown() = runBlocking {
        schedulerProvider.cancelAll()
        // TODO(b/151366899): this is less than ideal - we should investigate how to make the entire
        //  test process cancellable/stoppable, even when we cross scopes into a BindingContext or
        //  over to other RamDisk listeners.
        delay(100) // Let things calm down.
    }

    @Test
    fun singleton_initialState() = testRunner {
        val readHandle = readHandleManager.createSingletonHandle()
            as ReadSingletonHandle<*>
        assertThat(readHandle.fetch()).isNull()
    }

    @Test
    fun singleton_writeAndReadBackAndClear() = testRunner {
        val writeHandle = writeHandleManager.createSingletonHandle()
        val readHandle = readHandleManager.createSingletonHandle()
        var readHandleUpdated = readHandle.onUpdateDeferred()
        writeHandle.store(entity1)

        // Now read back from a different handle
        readHandleUpdated.await()
        val readBack = readHandle.fetch()
        assertThat(readBack).isEqualTo(entity1)

        readHandleUpdated = readHandle.onUpdateDeferred()
        writeHandle.store(entity2)
        readHandleUpdated.await()
        val readBack2 = readHandle.fetch()
        assertThat(readBack2).isEqualTo(entity2)

        readHandleUpdated = readHandle.onUpdateDeferred()
        writeHandle.clear()
        readHandleUpdated.await()
        val readBack3 = readHandle.fetch()
        assertThat(readBack3).isNull()
    }

    @Test
    fun singleton_writeAndReadBack() = testRunner {
        val writeHandle = writeHandleManager.createSingletonHandle()
        val readHandle = readHandleManager.createSingletonHandle()
        val readHandleUpdated = readHandle.onUpdateDeferred()
        writeHandle.store(entity1)

        // Now read back from a different handle
        readHandleUpdated.await()
        val readBack = readHandle.fetch()
        assertThat(readBack).isEqualTo(entity1)
    }

    @Test
    fun singleton_clearOnAClearDataWrittenByA() = testRunner {
        val handleA = writeHandleManager.createSingletonHandle()
        val handleB = readHandleManager.createSingletonHandle()

        var handleBUpdated = handleB.onUpdateDeferred()
        handleA.store(entity1)
        handleBUpdated.await()

        // Now read back from a different handle
        assertThat(handleB.fetch()).isEqualTo(entity1)

        handleBUpdated = handleB.onUpdateDeferred {
            log("handleB updated: $it")
            it == null
        }
        handleA.clear()
        handleBUpdated.await()

        assertThat(handleB.fetch()).isNull()
    }

    @Test
    fun singleton_clearOnAClearDataWrittenByB() = testRunner {
        val handleA = writeHandleManager.createSingletonHandle()
        val handleB = readHandleManager.createSingletonHandle()
        val handleBUpdated = handleB.onUpdateDeferred()
        handleA.store(entity1)
        withTimeout(1500) { handleBUpdated.await() }

        // Now read back from a different handle
        val updateADeferred = handleA.onUpdateDeferred()
        handleB.clear()

        assertThat(handleB.fetch()).isNull()

        updateADeferred.await()
        assertThat(handleA.fetch()).isNull()
    }

    @Test
    open fun singleton_writeAndOnUpdate() = testRunner {
        val writeHandle = writeHandleManager.createSingletonHandle()
            as WriteSingletonHandle<Person>

        // Now read back from a different handle
        val readHandle = readHandleManager.createSingletonHandle()

        val updateDeferred = CompletableDeferred<Person?>()
        readHandle.onUpdate {
            updateDeferred.complete(it)
        }
        writeHandle.store(entity1)
        assertThat(updateDeferred.await()).isEqualTo(entity1)
    }

    @Test
    fun singleton_dereferenceEntity() = testRunner {
        val writeHandle = writeHandleManager.createSingletonHandle()
        val readHandle = readHandleManager.createSingletonHandle()
        val readHandleUpdated = readHandle.onUpdateDeferred()
        writeHandle.store(entity1)

        // Create a second handle for the second entity, so we can store it.
        val storageKey = ReferenceModeStorageKey(backingKey, RamDiskStorageKey("entity2"))
        val refWriteHandle = writeHandleManager.createSingletonHandle(
            storageKey,
            "otherWriteHandle"
        )
        val refReadHandle = readHandleManager.createSingletonHandle(
            storageKey,
            "otherReadHandle"
        )
        val refReadHandleUpdated = refReadHandle.onUpdateDeferred()

        refWriteHandle.store(entity2)
        withTimeout(1500) { refReadHandleUpdated.await() }

        // Now read back entity1, and dereference its best_friend.
        withTimeout(1500) { readHandleUpdated.await() }
        val dereferencedRawEntity2 =
            (readHandle.fetch()!!.bestFriend)!!
                .also {
                    // Check that it's alive
                    assertThat(it.isAlive(coroutineContext)).isTrue()
                }
                .dereference(coroutineContext)!!
        val dereferencedEntity2 = Person.deserialize(dereferencedRawEntity2)
        assertThat(dereferencedEntity2).isEqualTo(entity2)

        // Do the same for entity2's best_friend
        val dereferencedRawEntity1 =
            refReadHandle.fetch()!!.bestFriend!!.dereference(coroutineContext)!!
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
                HandleContainerType.Collection,
                Hat
            ),
            hatCollectionKey
        ) as ReadWriteCollectionHandle<Hat>

        val fez = Hat(entityId = "fez-id", style = "fez")
        hatCollection.store(fez)
        val fezRef = hatCollection.createReference(fez)
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
        val writeHandle = writeHandleManager.createSingletonHandle()
        val readHandle = readHandleManager.createSingletonHandle()
        val readOnUpdate = readHandle.onUpdateDeferred()

        writeHandle.store(personWithHat)
        readOnUpdate.await()

        // Read out the entity, and fetch its hat.
        val entityOut = readHandle.fetch()!!
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
        handle.store(entity1)
        handleBUpdated.await()

        val readBack = handleB.fetch()!!
        assertThat(readBack.creationTimestamp).isNotEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(readBack.expirationTimestamp).isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
    }

    @Test
    fun singleton_withTTL() = testRunner {
        fakeTime.millis = 0
        val handle = writeHandleManager.createSingletonHandle(ttl = Ttl.Days(2))
        val handleB = readHandleManager.createSingletonHandle()

        var handleBUpdated = handleB.onUpdateDeferred()
        handle.store(entity1)
        handleBUpdated.await()

        val readBack = handleB.fetch()!!
        assertThat(readBack.creationTimestamp).isEqualTo(0)
        assertThat(readBack.expirationTimestamp).isEqualTo(2*24*3600*1000)

        val handleC = readHandleManager.createSingletonHandle(ttl = Ttl.Minutes(2))
        handleBUpdated = handleB.onUpdateDeferred()
        handleC.store(entity2)
        handleBUpdated.await()

        val readBack2 = handleB.fetch()!!
        assertThat(readBack2.creationTimestamp).isEqualTo(0)
        assertThat(readBack2.expirationTimestamp).isEqualTo(2*60*1000)

        // Fast forward time to 5 minutes later, so entity2 expires.
        fakeTime.millis += 5*60*1000
        assertThat(handleB.fetch()).isNull()
    }

    @Test
    open fun singleton_referenceLiveness() = runBlocking {
        // Create and store an entity.
        val writeEntityHandle = writeHandleManager.createCollectionHandle()
        val readEntityHandle = readHandleManager.createCollectionHandle()
        writeEntityHandle.store(entity1)
        log("Created and stored an entity")

        // Create and store a reference to the entity.
        val entity1Ref = writeEntityHandle.createReference(entity1)
        val writeRefHandle = writeHandleManager.createReferenceSingletonHandle()
        writeRefHandle.store(entity1Ref)
        log("Created and stored a reference")

        // Now read back the reference from a different handle.
        val readRefHandle = readHandleManager.createReferenceSingletonHandle()
        var reference = readRefHandle.fetch()!!
        assertThat(reference).isEqualTo(entity1Ref)

        // Reference should be alive.
        assertThat(reference.dereference()).isEqualTo(entity1)
        var storageReference = reference.toReferencable()
        assertThat(storageReference.isAlive(coroutineContext)).isTrue()
        assertThat(storageReference.isDead(coroutineContext)).isFalse()

        // Modify the entity.
        val modEntity1 = entity1.copy(name = "Ben")
        val entityModified = readEntityHandle.onUpdateDeferred()
        writeEntityHandle.store(modEntity1)
        withTimeout(1500) {
            entityModified.await()
        }

        // Reference should still be alive.
        reference = readRefHandle.fetch()!!
        // Make sure the storage stack created to dereference is going to be pointing to the latest
        // stuff.
        delay(200)
        assertThat(reference.dereference()).isEqualTo(modEntity1)
        storageReference = reference.toReferencable()
        assertThat(storageReference.isAlive(coroutineContext)).isTrue()
        assertThat(storageReference.isDead(coroutineContext)).isFalse()

        // Remove the entity from the collection.
        writeEntityHandle.remove(entity1)

        delay(200) // Let the delete trickle down to the store.

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
    fun collection_initialState() = testRunner {
        val handle = writeHandleManager.createCollectionHandle()
            as ReadCollectionHandle<*>
        assertThat(handle.fetchAll()).isEmpty()
    }

    @Test
    fun collection_addingToA_showsUpInB() = testRunner {
        val handleA = writeHandleManager.createCollectionHandle()
            as ReadWriteCollectionHandle<Person>
        val handleB = readHandleManager.createCollectionHandle()
        var gotUpdate = handleB.onUpdateDeferred()
        handleA.store(entity1)
        assertThat(handleA.fetchAll()).containsExactly(entity1)
        gotUpdate.await()
        assertThat(handleB.fetchAll()).containsExactly(entity1)

        // Ensure we get update from A before checking.
        // Since some test configurations may result in the handles
        // operating on different threads.
        gotUpdate = handleA.onUpdateDeferred()
        handleB.store(entity2)
        assertThat(handleB.fetchAll()).containsExactly(entity1, entity2)
        gotUpdate.await()
        assertThat(handleA.fetchAll()).containsExactly(entity1, entity2)
    }

    @Test
    fun collection_writeAndReadBack() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()
        val readHandle = readHandleManager.createCollectionHandle()
        val allHeard = Job()
        readHandle.onUpdate {
            if (it.size == 2) allHeard.complete()
        }
        writeHandle.store(entity1)
        writeHandle.store(entity2)

        // Now read back from a different handle, after hearing the updates.
        allHeard.join()
        val readBack = readHandle.fetchAll()
        assertThat(readBack).containsExactly(entity1, entity2)
    }

    @Test
    open fun collection_writeAndOnUpdate() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()
            as WriteCollectionHandle<Person>

        // Now read back from a different handle
        val readHandle = readHandleManager.createCollectionHandle()
            as ReadWriteCollectionHandle<Person>

        writeHandle.store(entity1)

        val updateDeferred = readHandle.onUpdateDeferred() { it.size == 2 }
        writeHandle.store(entity2)
        assertThat(updateDeferred.await()).containsExactly(entity1, entity2)
    }

    @Test
    open fun collection_writeMutatedEntityReplaces() = testRunner {
        val entity = TestParticle_Entities(text = "Hello")
        val handle = writeHandleManager.createCollectionHandle(entitySpec = TestParticle_Entities)
        handle.store(entity)

        assertThat(handle.fetchAll()).containsExactly(entity)

        val modified = entity.mutate(text = "Changed")
        assertThat(modified).isNotEqualTo(entity)
        handle.remove(modified)
        handle.store(modified)
        assertThat(handle.fetchAll()).containsExactly(modified)
    }

    @Test
    fun collection_removingFromA_isRemovedFromB() = testRunner {
        val handleA = readHandleManager.createCollectionHandle()
        val gotUpdateAtA = handleA.onUpdateDeferred {

            it.size == 2
        }
        val handleB = writeHandleManager.createCollectionHandle()
        var gotUpdateAtB = handleB.onUpdateDeferred {
            it.size == 1
        }

        handleA.store(entity1)
        handleB.store(entity2)
        gotUpdateAtA.await()
        gotUpdateAtB.await()

        assertThat(handleA.fetchAll()).containsExactly(entity1, entity2)
        assertThat(handleB.fetchAll()).containsExactly(entity1, entity2)

        gotUpdateAtB = handleB.onUpdateDeferred { it.size == 1 }
        handleA.remove(entity1)
        assertThat(handleA.fetchAll()).containsExactly(entity2)

        gotUpdateAtB.await()
        assertThat(handleB.fetchAll()).containsExactly(entity2)
    }

    @Test
    fun collection_clearingElementsFromA_clearsThemFromB() = testRunner {
        val handleA = readHandleManager.createCollectionHandle()
            as ReadWriteCollectionHandle<Person>
        val handleB = writeHandleManager.createCollectionHandle()
            as ReadWriteCollectionHandle<Person>

        val handleBGotAll7 = Job()
        handleB.onUpdate {
            log("HandleB onUpdate: ${it.map(Person::entityId)}")
            if (it.size == 7 || handleB.fetchAll().size == 7) handleBGotAll7.complete()
        }

        handleA.store(Person("a", "a", 1.0, true))
        handleA.store(Person("b", "b", 2.0, false))
        handleA.store(Person("c", "c", 3.0, true))
        handleA.store(Person("d", "d", 4.0, false))
        handleA.store(Person("e", "e", 5.0, true))
        handleA.store(Person("f", "f", 6.0, false))
        handleA.store(Person("g", "g", 7.0, true))

        assertThat(handleA.fetchAll()).hasSize(7)
        withTimeout(15000) {
            handleBGotAll7.join()
        }
        assertThat(handleB.fetchAll()).hasSize(7)

        // Ensure we get update from A before checking.
        // Since some test configurations may result in the handles
        // operating on different threads.
        val gotUpdate = handleA.onUpdateDeferred {
            log(
                "HandleA onUpdate: ${it.map(Person::entityId)}, " +
                    "HandleA fetchAll: ${handleA.fetchAll().map(Person::entityId)}"
            )
            // TODO: seems like the latest value is not always passed to the onUpdate callback. Not
            //  only that, but sometimes the same value can be passed more than once.  Using
            //  fetchAll here is more reliable. Need to figure out why.
            handleA.fetchAll().isEmpty()
        }

        handleB.clear()
        assertThat(handleB.fetchAll()).isEmpty()

        withTimeout(15000) {
            gotUpdate.await()
        }
        assertThat(handleA.fetchAll()).isEmpty()
    }

    @Test
    fun collection_entityDereference() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()
        val readHandle = readHandleManager.createCollectionHandle()

        val readUpdated = readHandle.onUpdateDeferred { it.size == 2 }

        writeHandle.store(entity1)
        writeHandle.store(entity2)
        readUpdated.await()

        // Just give a little more time for the references to be populated in the RamDisk for
        // dereferencing.
        delay(100)

        readHandle.fetchAll()
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
        val hatCollection = writeHandleManager.createHandle(
            HandleSpec(
                "hatCollection",
                HandleMode.ReadWrite,
                HandleContainerType.Collection,
                Hat
            ),
            hatCollectionKey
        ).also { it.awaitReady() } as ReadWriteCollectionHandle<Hat>

        val fez = Hat(entityId = "fez-id", style = "fez")
        hatCollection.store(fez)
        val fezRef = hatCollection.createReference(fez)
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
        val writeHandle = writeHandleManager.createCollectionHandle()
            as WriteCollectionHandle<Person>

        writeHandle.store(personWithHat)

        // Read out the entity, and fetch its hat.
        val readHandle = readHandleManager.createCollectionHandle()
            as ReadCollectionHandle<Person>

        // TODO(jwf): remove this delay when we get around to throwing on invalid thread usage.
        delay(100)
        val entityOut = readHandle.fetchAll().single { it.entityId == "a-hatted-individual" }
        val hatRef = entityOut.hat!!
        assertThat(hatRef).isEqualTo(fezStorageRef)
        val rawHat = hatRef.dereference(coroutineContext)!!
        val hat = Hat.deserialize(rawHat)
        assertThat(hat).isEqualTo(fez)
    }

    @Test
    fun collection_noTTL() = testRunner {
        val handle = writeHandleManager.createCollectionHandle()
        val handleB = readHandleManager.createCollectionHandle()
        val handleBChanged = handleB.onUpdateDeferred()
        handle.store(entity1)
        withTimeout(1500) { handleBChanged.await() }

        val readBack = handleB.fetchAll().first { it.entityId == entity1.entityId }
        assertThat(readBack.creationTimestamp).isNotEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(readBack.expirationTimestamp).isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
    }

    @Test
    fun collection_withTTL() = testRunner {
        fakeTime.millis = 0
        val handle = writeHandleManager.createCollectionHandle(ttl = Ttl.Days(2))
        val handleB = readHandleManager.createCollectionHandle()
        var handleBChanged = handleB.onUpdateDeferred()
        handle.store(entity1)
        withTimeout(1500) { handleBChanged.await() }

        val readBack = handleB.fetchAll().first { it.entityId == entity1.entityId }
        assertThat(readBack.creationTimestamp).isEqualTo(0)
        assertThat(readBack.expirationTimestamp).isEqualTo(2*24*3600*1000)

        val handleC = readHandleManager.createCollectionHandle(ttl = Ttl.Minutes(2))
        handleBChanged = handleB.onUpdateDeferred()
        handleC.store(entity2)
        handleBChanged.await()
        val readBack2 = handleB.fetchAll().first { it.entityId == entity2.entityId }
        assertThat(readBack2.creationTimestamp).isEqualTo(0)
        assertThat(readBack2.expirationTimestamp).isEqualTo(2*60*1000)

        // Fast forward time to 5 minutes later, so entity2 expires, entity1 doesn't.
        fakeTime.millis += 5*60*1000
        assertThat(handleB.fetchAll()).containsExactly(entity1)
    }

    @Test
    fun collection_addingToA_showsUpInQueryOnB() = testRunner {
        val readWriteHandle = writeHandleManager.createCollectionHandle()
            as ReadWriteCollectionHandle<Person>

        readWriteHandle.store(entity1)
        readWriteHandle.store(entity2)

        assertThat(readWriteHandle.fetchAll()).containsExactly(entity1, entity2)

        val rqHandle = readHandleManager.createCollectionHandle()
            as ReadWriteQueryCollectionHandle<Person, Double>


        // Ensure that the query argument is being used.
        assertThat(rqHandle.query(21.0)).containsExactly(entity1)
        assertThat(rqHandle.query(22.0)).containsExactly(entity2)

        // Ensure that an empty set of results can be returned.
        assertThat(rqHandle.query(60.0)).isEmpty()
    }

    @Test
    fun collection_dataConsideredInvalidByRefinementThrows() = testRunner {
        val timeTraveler = Person("doctor1", "the Doctor", -900.0, false, null, null)
        val readWriteHandle = writeHandleManager.createCollectionHandle()
            as ReadWriteCollectionHandle<Person>

        readWriteHandle.store(entity1)
        readWriteHandle.store(entity2)

        assertThat(readWriteHandle.fetchAll()).containsExactly(entity1, entity2)

        assertSuspendingThrows(IllegalArgumentException::class) {
            readWriteHandle.store(timeTraveler)
        }
    }

    @Test
    fun collection_queryWithInvalidQueryThrows() = testRunner {
        val handle = writeHandleManager.createCollectionHandle()
            as ReadWriteCollectionHandle<Person>

        handle.store(entity1)
        handle.store(entity2)

        assertThat(handle.fetchAll()).containsExactly(entity1, entity2)
        // Ensure that queries can be performed.
        (handle as ReadWriteQueryCollectionHandle<Person, Double>).query(44.0)
        // Ensure that queries can be performed.
        assertSuspendingThrows(ClassCastException::class) {
            (handle as ReadWriteQueryCollectionHandle<Person, String>).query("44")
        }
    }

    @Test
    open fun collection_referenceLiveness() = runBlocking<Unit> {
        // Create and store some entities.
        val writeEntityHandle = writeHandleManager.createCollectionHandle()
        writeEntityHandle.store(entity1)
        writeEntityHandle.store(entity2)

        // Create a store a reference to the entity.
        val entity1Ref = writeEntityHandle.createReference(entity1)
        val entity2Ref = writeEntityHandle.createReference(entity2)
        val writeRefHandle = writeHandleManager.createReferenceCollectionHandle()
        writeRefHandle.store(entity1Ref)
        writeRefHandle.store(entity2Ref)

        // Now read back the references from a different handle.
        val readRefHandle = readHandleManager.createReferenceCollectionHandle()
        var references = readRefHandle.fetchAll()
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
        var count = 0
        val entitiesWritten = readEntityHandle.onUpdateDeferred {
            ++count == 2
        }
        writeEntityHandle.store(modEntity1)
        writeEntityHandle.store(modEntity2)
        withTimeout(5000) {
            entitiesWritten.await()
        }

        delay(100) // Wait a little bit, to ensure the updates have propagated.

        // Reference should still be alive.
        references = readRefHandle.fetchAll()
        assertThat(references.map { it.dereference() }).containsExactly(modEntity1, modEntity2)
        references.forEach {
            val storageReference = it.toReferencable()
            assertThat(storageReference.isAlive(coroutineContext)).isTrue()
            assertThat(storageReference.isDead(coroutineContext)).isFalse()
        }

        // Remove the entities from the collection.
        writeEntityHandle.remove(entity1)
        writeEntityHandle.remove(entity2)

        delay(200) // Let the deletes propagate down

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

    private suspend fun Handle.awaitReady() = coroutineScope {
        val job = Job()
        onReady { job.complete() }
        job.join()
    }

    private suspend fun EntityHandleManager.createSingletonHandle(
        storageKey: StorageKey = singletonKey,
        name: String = "singletonWriteHandle",
        ttl: Ttl = Ttl.Infinite
    ) = createHandle(
        HandleSpec(
            name,
            HandleMode.ReadWrite,
            HandleContainerType.Singleton,
            Person
        ),
        storageKey,
        ttl
    ).also { it.awaitReady() } as ReadWriteSingletonHandle<Person>

    private suspend fun EntityHandleManager.createCollectionHandle(
        storageKey: StorageKey = collectionKey,
        name: String = "collectionReadHandle",
        ttl: Ttl = Ttl.Infinite
    ) = createCollectionHandle(storageKey, name, ttl, Person)

    private suspend fun <T : Entity> EntityHandleManager.createCollectionHandle(
        storageKey: StorageKey = collectionKey,
        name: String = "collectionReadHandle",
        ttl: Ttl = Ttl.Infinite,
        entitySpec: EntitySpec<T>
    ) = createHandle(
        HandleSpec(
            name,
            HandleMode.ReadWriteQuery,
            HandleContainerType.Collection,
            entitySpec
        ),
        storageKey,
        ttl
    ).also { it.awaitReady() } as ReadWriteQueryCollectionHandle<T, Any>

    private suspend fun EntityHandleManager.createReferenceSingletonHandle(
        storageKey: StorageKey = singletonRefKey,
        name: String = "referenceSingletonWriteHandle",
        ttl: Ttl = Ttl.Infinite
    ) = createHandle(
        HandleSpec(
            name,
            HandleMode.ReadWrite,
            HandleContainerType.Singleton,
            Person,
            HandleDataType.Reference
        ),
        storageKey,
        ttl
    ).also { it.awaitReady() } as ReadWriteSingletonHandle<Reference<Person>>

    private suspend fun EntityHandleManager.createReferenceCollectionHandle(
        storageKey: StorageKey = collectionRefKey,
        name: String = "referenceCollectionReadHandle",
        ttl: Ttl = Ttl.Infinite
    ) = createHandle(
        HandleSpec(
            name,
            HandleMode.ReadWriteQuery,
            HandleContainerType.Collection,
            Person,
            HandleDataType.Reference
        ),
        storageKey,
        ttl
    ).also { it.awaitReady() } as ReadWriteQueryCollectionHandle<Reference<Person>, Any>

    private suspend fun <T> ReadableHandle<T>.onUpdateDeferred(
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
            "hat" to null
        ),
        collections = emptyMap(),
        creationTimestamp = fakeTime.millis,
        expirationTimestamp = RawEntity.UNINITIALIZED_TIMESTAMP
    )

    data class Person(
        override val entityId: ReferenceId,
        val name: String,
        val age: Double,
        val isCool: Boolean,
        val bestFriend: StorageReference? = null,
        val hat: StorageReference? = null
    ) : Entity {

        var raw: RawEntity? = null
        var creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
        override var expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP

        override fun ensureEntityFields(
            idGenerator: Generator,
            handleName: String,
            time: Time,
            ttl: Ttl
        ) {
            creationTimestamp = time.currentTimeMillis
            if (ttl != Ttl.Infinite) {
                expirationTimestamp = ttl.calculateExpiration(time)
            }
        }

        override fun serialize() = RawEntity(
            entityId,
            singletons = mapOf(
                "name" to name.toReferencable(),
                "age" to age.toReferencable(),
                "is_cool" to isCool.toReferencable(),
                "best_friend" to bestFriend,
                "hat" to hat
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
                isCool = (data.singletons["is_cool"] as ReferencablePrimitive<Boolean>).value,
                bestFriend = data.singletons["best_friend"] as? StorageReference,
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
                        "name" to FieldType.Text,
                        "age" to FieldType.Number,
                        "is_cool" to FieldType.Boolean,
                        "best_friend" to FieldType.EntityRef("person-hash"),
                        "hat" to FieldType.EntityRef("hat-hash")
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
