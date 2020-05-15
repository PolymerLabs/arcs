package arcs.core.entity

import arcs.core.common.Id.Generator
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtData
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
import arcs.core.storage.driver.testutil.asyncWaitForUpdate
import arcs.core.storage.driver.testutil.waitUntilSet
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
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
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
        readHandleManager.close()
        writeHandleManager.close()
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
        writeHandle.store(entity1).join()

        // Now read back from a different handle
        readHandleUpdated.await()
        val readBack = readHandle.fetch()
        assertThat(readBack).isEqualTo(entity1)

        readHandleUpdated = readHandle.onUpdateDeferred()
        writeHandle.store(entity2).join()
        readHandleUpdated.await()
        val readBack2 = readHandle.fetch()
        assertThat(readBack2).isEqualTo(entity2)

        readHandleUpdated = readHandle.onUpdateDeferred()
        writeHandle.clear().join()
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
    open fun singleton_clearOnAClearDataWrittenByA() = testRunner {
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
    open fun singleton_clearOnAClearDataWrittenByB() = testRunner {
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
    open fun singleton_dereferenceEntity() = testRunner {
        val writeHandle = writeHandleManager.createSingletonHandle()
        val readHandle = readHandleManager.createSingletonHandle()
        val readHandleUpdated = readHandle.onUpdateDeferred()
        writeHandle.store(entity1).join()
        withTimeout(1500) { readHandleUpdated.await() }
        log("Wrote entity1 to writeHandle")

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
        val ramDiskKnows = async(Dispatchers.IO) {
            val ref = refWriteHandle.createReference(entity2)
            val refKey = ref.toReferencable().referencedStorageKey()
            RamDisk.waitUntilSet(refKey)
        }
        withTimeout(1500) {
            refReadHandleUpdated.await()
            ramDiskKnows.await()
        }

        // Now read back entity1, and dereference its best_friend.
        val dereferencedRawEntity2 = withContext(readHandle.dispatcher) {
            (readHandle.fetch()!!.bestFriend)!!
                .also {
                    // Check that it's alive
                    assertThat(it.isAlive(coroutineContext)).isTrue()
                }
                .dereference(coroutineContext)!!
        }
        val dereferencedEntity2 = Person.deserialize(dereferencedRawEntity2)
        assertThat(dereferencedEntity2).isEqualTo(entity2)

        // Do the same for entity2's best_friend
        val dereferencedRawEntity1 =
            refReadHandle.fetch()!!.bestFriend!!.dereference(coroutineContext)!!
        val dereferencedEntity1 = Person.deserialize(dereferencedRawEntity1)
        assertThat(dereferencedEntity1).isEqualTo(entity1)
    }

    @Test
    open fun singleton_dereferenceEntity_nestedReference() = testRunner {
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
        withContext(hatCollection.dispatcher) { hatCollection.store(fez) }
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

        withContext(writeHandle.dispatcher) { writeHandle.store(personWithHat) }

        withTimeout(2000) {
            RamDisk.waitUntilSet(fezStorageRef.referencedStorageKey())
            readOnUpdate.await()
        }

        // Read out the entity, and fetch its hat.
        withContext(readHandle.dispatcher) {
            val entityOut = readHandle.fetch()!!
            val hatRef = entityOut.hat!!
            assertThat(hatRef).isEqualTo(fezStorageRef)
            val rawHat = hatRef.dereference(coroutineContext)!!
            val hat = Hat.deserialize(rawHat)
            assertThat(hat).isEqualTo(fez)
        }
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
    open fun singleton_withTTL() = testRunner {
        fakeTime.millis = 0
        val handle = writeHandleManager.createSingletonHandle(ttl = Ttl.Days(2))
        val handleB = readHandleManager.createSingletonHandle()

        var handleBUpdated = handleB.onUpdateDeferred()
        handle.store(entity1).join()
        handleBUpdated.await()

        val readBack = handleB.fetch()!!
        assertThat(readBack.creationTimestamp).isEqualTo(0)
        assertThat(readBack.expirationTimestamp).isEqualTo(2*24*3600*1000)

        val handleC = readHandleManager.createSingletonHandle(ttl = Ttl.Minutes(2))
        handleBUpdated = handleB.onUpdateDeferred()
        handleC.store(entity2).join()
        handleBUpdated.await()

        val readBack2 = handleB.fetch()!!
        assertThat(readBack2.creationTimestamp).isEqualTo(0)
        assertThat(readBack2.expirationTimestamp).isEqualTo(2*60*1000)

        // Fast forward time to 5 minutes later, so entity2 expires.
        fakeTime.millis += 5*60*1000
        assertThat(handleB.fetch()).isNull()
    }

    @Test
    fun referenceSingleton_withTtl() = testRunner {
        fakeTime.millis = 0
        // Create and store an entity with no TTL.
        val entityHandle = writeHandleManager.createSingletonHandle()
        var updated = entityHandle.onUpdateDeferred()
        entityHandle.store(entity1).join()
        updated.await()

        // Create and store a reference with TTL.
        val entity1Ref = entityHandle.createReference(entity1)
        val refHandle = writeHandleManager.createReferenceSingletonHandle(ttl = Ttl.Minutes(2))
        withContext(refHandle.dispatcher) { refHandle.store(entity1Ref) }
        val readBack = refHandle.fetch()!!
        assertThat(readBack.creationTimestamp).isEqualTo(0)
        assertThat(readBack.expirationTimestamp).isEqualTo(2 * 60 * 1000)

        // Fast forward time to 5 minutes later, so the reference expires.
        fakeTime.millis += 5 * 60 * 1000
        assertThat(refHandle.fetch()).isNull()
    }

    @Test
    open fun singleton_referenceLiveness() = runBlocking {
        // Create and store an entity.
        val writeEntityHandle = writeHandleManager.createCollectionHandle()
        val readEntityHandle = readHandleManager.createCollectionHandle()
        withContext(writeEntityHandle.dispatcher) { writeEntityHandle.store(entity1) }
        log("Created and stored an entity")

        // Create and store a reference to the entity.
        val entity1Ref = writeEntityHandle.createReference(entity1)
        val writeRefHandle = writeHandleManager.createReferenceSingletonHandle()
        val readRefHandle = readHandleManager.createReferenceSingletonHandle()
        val refHeard = readRefHandle.onUpdateDeferred()
        withContext(writeRefHandle.dispatcher) { writeRefHandle.store(entity1Ref) }
        log("Created and stored a reference")

        withTimeout(1500) {
            RamDisk.waitUntilSet(entity1Ref.toReferencable().referencedStorageKey())
            refHeard.await()
        }

        // Now read back the reference from a different handle.
        var reference = withContext(readRefHandle.dispatcher) { readRefHandle.fetch()!! }
        assertThat(reference).isEqualTo(entity1Ref)

        // Reference should be alive.
        assertThat(reference.dereference()).isEqualTo(entity1)
        var storageReference = reference.toReferencable()
        assertThat(storageReference.isAlive(coroutineContext)).isTrue()
        assertThat(storageReference.isDead(coroutineContext)).isFalse()

        // Modify the entity.
        var ramDiskKnows =
            RamDisk.asyncWaitForUpdate(reference.toReferencable().referencedStorageKey())
        val modEntity1 = entity1.copy(name = "Ben")
        val entityModified = readEntityHandle.onUpdateDeferred()
        withContext(writeEntityHandle.dispatcher) { writeEntityHandle.store(modEntity1) }
        withTimeout(1500) {
            entityModified.await()
            ramDiskKnows.await()
        }

        // Reference should still be alive.
        reference = readRefHandle.fetch()!!
        val dereferenced = reference.dereference()
        log("Dereferenced: $dereferenced")
        assertThat(dereferenced).isEqualTo(modEntity1)
        storageReference = reference.toReferencable()
        assertThat(storageReference.isAlive(coroutineContext)).isTrue()
        assertThat(storageReference.isDead(coroutineContext)).isFalse()

        ramDiskKnows = RamDisk.asyncWaitForUpdate(storageReference.referencedStorageKey())
        // Remove the entity from the collection.
        val heardTheDelete = readEntityHandle.onUpdateDeferred { it.isEmpty() }
        writeEntityHandle.remove(entity1).join()
        withTimeout(1500) {
            ramDiskKnows.await()
            heardTheDelete.await()
        }

        // Reference should be dead. (Removed entities currently aren't actually deleted, but
        // instead are "nulled out".)
        withContext(readRefHandle.dispatcher) {
            assertThat(storageReference.dereference())
                .isEqualTo(createNulledOutPerson("entity1"))
        }
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
        handleA.store(entity1).join()
        assertThat(handleA.fetchAll()).containsExactly(entity1)
        gotUpdate.await()
        assertThat(handleB.fetchAll()).containsExactly(entity1)

        // Ensure we get update from A before checking.
        // Since some test configurations may result in the handles
        // operating on different threads.
        gotUpdate = handleA.onUpdateDeferred()
        handleB.store(entity2).join()
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
        writeHandle.store(entity1).join()
        writeHandle.store(entity2).join()

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

        // Entity internals should not change.
        assertThat(modified.entityId).isEqualTo(entity.entityId)
        assertThat(modified.creationTimestamp).isEqualTo(entity.creationTimestamp)
        assertThat(modified.expirationTimestamp).isEqualTo(entity.expirationTimestamp)

        handle.store(modified)
        assertThat(handle.fetchAll()).containsExactly(modified)
    }

    @Test
    open fun clientCanSetEntityId() = testRunner {
        fakeTime.millis = 0
        // Ask faketime to increment to test with changing timestamps.
        fakeTime.autoincrement = 1
        val id = "MyId"
        val entity = TestParticle_Entities(text = "Hello", number = 1.0, entityId = id)
        val handle = writeHandleManager.createCollectionHandle(entitySpec = TestParticle_Entities)
        withContext(handle.dispatcher) {
            handle.store(entity)
            assertThat(handle.fetchAll()).containsExactly(entity)

            // A different entity, with the same ID, should replace the first.
            val entity2 = TestParticle_Entities(text = "New Hello", number = 1.1, entityId = id)
            handle.store(entity2)
            assertThat(handle.fetchAll()).containsExactly(entity2)
            // Timestamps also get updated.
            assertThat(entity2.creationTimestamp).isEqualTo(2)

            // An entity with a different ID.
            val entity3 = TestParticle_Entities(text = "Bye", number = 2.0, entityId = "OtherId")
            handle.store(entity3)
            assertThat(handle.fetchAll()).containsExactly(entity3, entity2)
        }
    }

    @Test
    open fun collection_removingFromA_isRemovedFromB() = testRunner {
        val handleA = readHandleManager.createCollectionHandle()
        val gotUpdateAtA = handleA.onUpdateDeferred {

            it.size == 2
        }
        val handleB = writeHandleManager.createCollectionHandle()
        var gotUpdateAtB = handleB.onUpdateDeferred {
            it.size == 1
        }

        handleA.store(entity1).join()
        handleB.store(entity2).join()
        gotUpdateAtA.await()
        gotUpdateAtB.await()

        assertThat(handleA.fetchAll()).containsExactly(entity1, entity2)
        assertThat(handleB.fetchAll()).containsExactly(entity1, entity2)

        gotUpdateAtB = handleB.onUpdateDeferred { it.size == 1 }
        handleA.remove(entity1).join()
        assertThat(handleA.fetchAll()).containsExactly(entity2)

        gotUpdateAtB.await()
        assertThat(handleB.fetchAll()).containsExactly(entity2)
    }

    @Test
    open fun collection_clearingElementsFromA_clearsThemFromB() = testRunner {
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
    open fun collection_entityDereference() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()
        val readHandle = readHandleManager.createCollectionHandle()
        val readUpdated = readHandle.onUpdateDeferred { it.size == 2 }

        withContext(writeHandle.dispatcher) {
            writeHandle.store(entity1)
            writeHandle.store(entity2)
        }
        log("wrote entity1 and entity2 to writeHandle")

        withTimeout(2000) {
            RamDisk.waitUntilSet(entity1.bestFriend!!.referencedStorageKey())
            log("RamDisk heard of entity1's best friend (entity2)")
            RamDisk.waitUntilSet(entity2.bestFriend!!.referencedStorageKey())
            log("RamDisk heard of entity2's best friend (entity1)")
            readUpdated.await()
        }
        log("readHandle and the ramDisk have heard of the update")

        withContext(readHandle.dispatcher) {
            readHandle.fetchAll()
                .also { assertThat(it).hasSize(2) }
                .forEach { entity ->
                    val expectedBestFriend = if (entity.entityId == "entity1") entity2 else entity1
                    val actualRawBestFriend = entity.bestFriend!!.dereference(coroutineContext)!!
                    val actualBestFriend = Person.deserialize(actualRawBestFriend)
                    assertThat(actualBestFriend).isEqualTo(expectedBestFriend)
                }
        }
    }

    @Test
    open fun collection_dereferenceEntity_nestedReference() = testRunner {
        // Create a stylish new hat, and create a reference to it.
        val hatCollection = writeHandleManager.createHandle(
            HandleSpec(
                "hatCollection",
                HandleMode.ReadWrite,
                HandleContainerType.Collection,
                Hat
            ),
            hatCollectionKey
        ).awaitReady() as ReadWriteCollectionHandle<Hat>

        val fez = Hat(entityId = "fez-id", style = "fez")
        hatCollection.store(fez).join()
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
        writeHandle.store(personWithHat).join()

        // Read out the entity, and fetch its hat.
        val readHandle = readHandleManager.createCollectionHandle()
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
    open fun collection_noTTL() = testRunner {
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
        handle.store(entity1).join()
        withTimeout(1500) { handleBChanged.await() }

        val readBack = handleB.fetchAll().first { it.entityId == entity1.entityId }
        assertThat(readBack.creationTimestamp).isEqualTo(0)
        assertThat(readBack.expirationTimestamp).isEqualTo(2*24*3600*1000)

        val handleC = readHandleManager.createCollectionHandle(ttl = Ttl.Minutes(2))
        handleBChanged = handleB.onUpdateDeferred()
        handleC.store(entity2).join()
        handleBChanged.await()
        val readBack2 = handleB.fetchAll().first { it.entityId == entity2.entityId }
        assertThat(readBack2.creationTimestamp).isEqualTo(0)
        assertThat(readBack2.expirationTimestamp).isEqualTo(2*60*1000)

        // Fast forward time to 5 minutes later, so entity2 expires, entity1 doesn't.
        fakeTime.millis += 5*60*1000
        assertThat(handleB.fetchAll()).containsExactly(entity1)
    }

    @Test
    fun referenceCollection_withTtl() = testRunner {
        fakeTime.millis = 0
        // Create and store an entity with no TTL.
        val entityHandle = writeHandleManager.createCollectionHandle()
        var updated = entityHandle.onUpdateDeferred()
        entityHandle.store(entity1).join()
        updated.await()

        // Create and store a reference with TTL.
        val entity1Ref = entityHandle.createReference(entity1)
        val refHandle = writeHandleManager.createReferenceCollectionHandle(ttl = Ttl.Minutes(2))
        withContext(refHandle.dispatcher) { refHandle.store(entity1Ref) }
        val readBack = refHandle.fetchAll().first()
        assertThat(readBack.creationTimestamp).isEqualTo(0)
        assertThat(readBack.expirationTimestamp).isEqualTo(2 * 60 * 1000)

        // Fast forward time to 5 minutes later, so the reference expires.
        fakeTime.millis += 5 * 60 * 1000
        assertThat(refHandle.fetchAll()).isEmpty()
    }

    @Test
    open fun collection_addingToA_showsUpInQueryOnB() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()
        val readHandle = readHandleManager.createCollectionHandle()

        val readUpdatedTwice = readHandle.onUpdateDeferred {
            log("B.onUpdate(${it.map(Person::entityId)})")
            it.size == 2
        }

        log("Writing entity1 to A")
        writeHandle.store(entity1)
        log("Writing entity2 to A")
        writeHandle.store(entity2)

        withTimeout(1500) {
            log("Waiting for entities on B")
            readUpdatedTwice.await()
        }

        // Ensure that the query argument is being used.
        assertThat(readHandle.query(21.0)).containsExactly(entity1)
        assertThat(readHandle.query(22.0)).containsExactly(entity2)

        // Ensure that an empty set of results can be returned.
        assertThat(readHandle.query(60.0)).isEmpty()
    }

    @Test
    fun collection_dataConsideredInvalidByRefinementThrows() = testRunner {
        val timeTraveler = Person("doctor1", "the Doctor", -900.0, false, null, null)
        val handle = writeHandleManager.createCollectionHandle()
        handle.store(entity1).join()
        handle.store(entity2).join()

        handle.store(entity1)
        handle.store(entity2)

        assertThat(handle.fetchAll()).containsExactly(entity1, entity2)

        assertSuspendingThrows(IllegalArgumentException::class) {
            handle.store(timeTraveler)
        }
    }

    @Test
    fun collection_queryWithInvalidQueryThrows() = testRunner {
        val handle = writeHandleManager.createCollectionHandle()
        handle.store(entity1).join()
        handle.store(entity2).join()

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
        val readEntityHandle = readHandleManager.createCollectionHandle()
        writeEntityHandle.store(entity1).join()
        writeEntityHandle.store(entity2).join()

        // Create a store a reference to the entity.
        val entity1Ref = writeEntityHandle.createReference(entity1)
        val entity2Ref = writeEntityHandle.createReference(entity2)
        val writeRefHandle = writeHandleManager.createReferenceCollectionHandle()
        writeRefHandle.store(entity1Ref).join()
        writeRefHandle.store(entity2Ref).join()

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
        writeEntityHandle.remove(entity1).join()
        writeEntityHandle.remove(entity2).join()

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
    ).awaitReady() as ReadWriteSingletonHandle<Person>

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
    ).awaitReady() as ReadWriteQueryCollectionHandle<T, Any>

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
    ).awaitReady() as ReadWriteSingletonHandle<Reference<Person>>

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
