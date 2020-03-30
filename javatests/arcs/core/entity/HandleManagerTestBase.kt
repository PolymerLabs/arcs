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
import arcs.core.storage.DriverFactory
import arcs.core.storage.Reference as StorageReference
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.util.Time
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
open class HandleManagerTestBase {
    private val backingKey = RamDiskStorageKey("entities")
    private val hatsBackingKey = RamDiskStorageKey("hats")

    data class Person(
        override val entityId: ReferenceId,
        val name: String,
        val age: Int,
        val isCool: Boolean,
        val bestFriend: StorageReference? = null,
        val hat: StorageReference? = null
    ) : Entity {

        var raw: RawEntity? = null
        var creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
        var expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP

        override fun ensureEntityFields(idGenerator: Generator, handleName: String, time: Time, ttl: Ttl) {
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
                age = (data.singletons["age"] as ReferencablePrimitive<Int>).value,
                isCool = (data.singletons["is_cool"] as ReferencablePrimitive<Boolean>).value,
                bestFriend = data.singletons["best_friend"] as? StorageReference,
                hat = data.singletons["hat"] as? StorageReference
            ).apply {
                raw = data
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

    private val entity1 = Person(
        entityId = "entity1",
        name = "Jason",
        age = 21,
        isCool = false,
        bestFriend = StorageReference("entity2", backingKey, null),
        hat = null
    )
    private val entity2 = Person(
        entityId = "entity2",
        name = "Jason",
        age = 22,
        isCool = true,
        bestFriend = StorageReference("entity1", backingKey, null),
        hat = null
    )

    data class Hat(
        override val entityId: ReferenceId,
        val style: String
    ) : Entity {
        override fun ensureEntityFields(idGenerator: Generator, handleName: String, time: Time, ttl: Ttl) {}

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

    lateinit var readHandleManager: EntityHandleManager
    lateinit var writeHandleManager: EntityHandleManager

    open var testRunner = { block: suspend CoroutineScope.() -> Unit ->
        runBlockingTest { this.block() }
    }

    // Must call from subclasses.
    open fun setUp() {
        DriverAndKeyConfigurator.configure(null)
        SchemaRegistry.register(Person)
        SchemaRegistry.register(Hat)
        DriverFactory.register(RamDiskDriverProvider())
    }

    // Must call from subclasses
    open fun tearDown() {
        RamDisk.clear()
        DriverFactory.clearRegistrations()
        SchemaRegistry.clearForTest()
    }

    @Test
    fun singleton_initialState() = testRunner {
        val readHandle = readHandleManager.createSingletonHandle()
        assertThat(readHandle.fetch()).isNull()
    }

    @Test
    fun singleton_writeAndReadBackAndClear() = testRunner {
        val writeHandle = writeHandleManager.createSingletonHandle()
        writeHandle.store(entity1)

        // Now read back from a different handle
        val readHandle = readHandleManager.createSingletonHandle()
        val readBack = readHandle.fetch()
        assertThat(readBack).isEqualTo(entity1)

        writeHandle.store(entity2)
        val readBack2 = readHandle.fetch()
        assertThat(readBack2).isEqualTo(entity2)

        writeHandle.clear()
        val readBack3 = readHandle.fetch()
        assertThat(readBack3).isNull()
    }

    @Test
    fun singleton_writeAndReadBack() = testRunner {
        val writeHandle = writeHandleManager.createSingletonHandle()
        writeHandle.store(entity1)

        // Now read back from a different handle
        val readHandle = readHandleManager.createSingletonHandle()
        val readBack = readHandle.fetch()
        assertThat(readBack).isEqualTo(entity1)
    }

    @Test
    fun singleton_clearOnAClearDataWrittenByA() = testRunner {
        val handleA = writeHandleManager.createSingletonHandle()
        handleA.store(entity1)

        // Now read back from a different handle
        val handleB = readHandleManager.createSingletonHandle()
        assertThat(handleB.fetch()).isEqualTo(entity1)

        handleA.clear()
        assertThat(handleB.fetch()).isNull()
    }

    @Test
    fun singleton_clearOnAClearDataWrittenByB() = testRunner {
        val handleA = writeHandleManager.createSingletonHandle()
        handleA.store(entity1)

        // Now read back from a different handle
        val handleB = readHandleManager.createSingletonHandle()
        handleB.awaitReady()
        handleB.clear()

        assertThat(handleB.fetch()).isNull()
        assertThat(handleA.fetch()).isNull()
    }

    @Test
    open fun singleton_writeAndOnUpdate() = testRunner {
        val writeHandle = writeHandleManager.createSingletonHandle()

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

        refWriteHandle.store(entity2)

        // Now read back entity1, and dereference its best_friend.
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
            age = 25,
            isCool = true,
            bestFriend = null,
            hat = fezStorageRef
        )
        val writeHandle = writeHandleManager.createSingletonHandle()
        writeHandle.store(personWithHat)

        // Read out the entity, and fetch its hat.
        val readHandle = readHandleManager.createSingletonHandle()
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
        handle.store(entity1)

        val handleB = readHandleManager.createSingletonHandle()
        val readBack = handleB.fetch()!!
        assertThat(readBack.raw!!.creationTimestamp).isNotEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(readBack.raw!!.expirationTimestamp).isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
    }

    @Test
    fun singleton_withTTL() = testRunner {
        val handle = writeHandleManager.createSingletonHandle(ttl = Ttl.Days(2))
        handle.store(entity1)

        val handleB = readHandleManager.createSingletonHandle()
        val readBack = handleB.fetch()!!
        assertThat(readBack.raw!!.creationTimestamp)
            .isNotEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(readBack.raw!!.expirationTimestamp)
            .isGreaterThan(readBack.raw!!.creationTimestamp)

        val handleC = readHandleManager.createSingletonHandle(ttl = Ttl.Minutes(2))
        handleC.store(entity2)
        val readBack2 = handleB.fetch()!!
        assertThat(readBack2.raw!!.creationTimestamp)
            .isNotEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(readBack2.raw!!.expirationTimestamp)
            .isGreaterThan(readBack2.raw!!.creationTimestamp)
        assertThat(readBack2.raw!!.expirationTimestamp)
            .isLessThan(readBack.raw!!.expirationTimestamp)
    }

    @Test
    open fun singleton_referenceLiveness() = runBlocking {
        // Create and store an entity.
        val writeEntityHandle = writeHandleManager.createCollectionHandle()
        writeEntityHandle.store(entity1)

        // Create a store a reference to the entity.
        val entity1Ref = writeEntityHandle.createReference(entity1)
        val writeRefHandle = writeHandleManager.createReferenceSingletonHandle()
        writeRefHandle.store(entity1Ref)

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
        writeEntityHandle.store(modEntity1)

        // Reference should still be alive.
        reference = readRefHandle.fetch()!!
        assertThat(reference.dereference()).isEqualTo(modEntity1)
        storageReference = reference.toReferencable()
        assertThat(storageReference.isAlive(coroutineContext)).isTrue()
        assertThat(storageReference.isDead(coroutineContext)).isFalse()

        // Remove the entity from the collection.
        writeEntityHandle.remove(entity1)

        // Reference should be dead.
        // TODO(b/152436411): The reference should dereference to null, but in fact dereferences to
        // a RawEntity full of nulls.
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
        assertThat(handle.fetchAll()).isEmpty()
    }

    @Test
    fun collection_addingToA_showsUpInB() = testRunner {
        val handleA = writeHandleManager.createCollectionHandle()
        val handleB = readHandleManager.createCollectionHandle()
        handleA.store(entity1)
        assertThat(handleA.fetchAll()).containsExactly(entity1)
        assertThat(handleB.fetchAll()).containsExactly(entity1)

        // Ensure we get update from A before checking.
        // Since some test configurations may result in the handles
        // operating on different threads.
        val gotUpdate = CompletableDeferred<Unit>()
        handleA.onUpdate {
            gotUpdate.complete(Unit)
        }
        handleB.store(entity2)
        assertThat(handleB.fetchAll()).containsExactly(entity1, entity2)
        gotUpdate.await()
        assertThat(handleA.fetchAll()).containsExactly(entity1, entity2)
    }

    @Test
    fun collection_writeAndReadBack() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()
        writeHandle.store(entity1)
        writeHandle.store(entity2)

        // Now read back from a different handle
        val readHandle = readHandleManager.createCollectionHandle()
        val readBack = readHandle.fetchAll()
        assertThat(readBack).containsExactly(entity1, entity2)
    }

    @Test
    open fun collection_writeAndOnUpdate() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()

        // Now read back from a different handle
        val readHandle = readHandleManager.createCollectionHandle()
        writeHandle.store(entity1)

        val updateDeferred = CompletableDeferred<Set<Person>>()
        readHandle.onUpdate {
            if (it.size == 2) {
                updateDeferred.complete(it)
            }
        }

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
        val handleB = writeHandleManager.createCollectionHandle()

        handleA.store(entity1)
        handleB.store(entity2)

        assertThat(handleA.fetchAll()).containsExactly(entity1, entity2)
        assertThat(handleB.fetchAll()).containsExactly(entity1, entity2)

        handleA.remove(entity1)
        assertThat(handleA.fetchAll()).containsExactly(entity2)
        assertThat(handleB.fetchAll()).containsExactly(entity2)
    }

    @Test
    fun collection_clearingElementsFromA_clearsThemFromB() = testRunner {
        val handleA = readHandleManager.createCollectionHandle()
        val handleB = writeHandleManager.createCollectionHandle()

        handleA.store(Person("a", "a", 1, true))
        handleA.store(Person("b", "b", 2, false))
        handleA.store(Person("c", "c", 3, true))
        handleA.store(Person("d", "d", 4, false))
        handleA.store(Person("e", "e", 5, true))
        handleA.store(Person("f", "f", 6, false))
        handleA.store(Person("g", "g", 7, true))

        assertThat(handleA.fetchAll()).hasSize(7)
        assertThat(handleB.fetchAll()).hasSize(7)

        // Ensure we get update from A before checking.
        // Since some test configurations may result in the handles
        // operating on different threads.
        val gotUpdate = CompletableDeferred<Unit>()
        handleA.onUpdate {
            if (it.isEmpty()) {
                gotUpdate.complete(Unit)
            }
        }

        handleB.clear()
        assertThat(handleB.fetchAll()).isEmpty()

        gotUpdate.await()
        assertThat(handleA.fetchAll()).isEmpty()
    }

    @Test
    fun collection_entityDereference() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()
        writeHandle.store(entity1)
        writeHandle.store(entity2)

        val readHandle = readHandleManager.createCollectionHandle()
        readHandle.fetchAll().also { assertThat(it).hasSize(2) }.forEach { entity ->
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
        ) as ReadWriteCollectionHandle<Hat>
        val fez = Hat(entityId = "fez-id", style = "fez")
        hatCollection.store(fez)
        val fezRef = hatCollection.createReference(fez)
        val fezStorageRef = fezRef.toReferencable()

        // Give the hat to an entity and store it.
        val personWithHat = Person(
            entityId = "a-hatted-individual",
            name = "Jason",
            age = 25,
            isCool = true,
            bestFriend = null,
            hat = fezStorageRef
        )
        val writeHandle = writeHandleManager.createCollectionHandle()
        writeHandle.store(personWithHat)

        // Read out the entity, and fetch its hat.
        val readHandle = readHandleManager.createCollectionHandle()
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
        handle.store(entity1)

        val handleB = readHandleManager.createCollectionHandle()
        val readBack = handleB.fetchAll().first { it.entityId == entity1.entityId }
        assertThat(readBack.raw!!.creationTimestamp).isNotEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(readBack.raw!!.expirationTimestamp).isEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
    }

    @Test
    fun collection_withTTL() = testRunner {
        val handle = writeHandleManager.createCollectionHandle(ttl = Ttl.Days(2))
        handle.store(entity1)

        val handleB = readHandleManager.createCollectionHandle()
        val readBack = handleB.fetchAll().first { it.entityId == entity1.entityId }
        assertThat(readBack.raw!!.creationTimestamp)
            .isNotEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(readBack.raw!!.expirationTimestamp)
            .isGreaterThan(readBack.raw!!.creationTimestamp)

        val handleC = readHandleManager.createCollectionHandle(ttl = Ttl.Minutes(2))
        handleC.store(entity2)
        val readBack2 = handleB.fetchAll().first { it.entityId == entity2.entityId }
        assertThat(readBack2.raw!!.creationTimestamp)
            .isNotEqualTo(RawEntity.UNINITIALIZED_TIMESTAMP)
        assertThat(readBack2.raw!!.expirationTimestamp)
            .isGreaterThan(readBack2.raw!!.creationTimestamp)
        assertThat(readBack2.raw!!.expirationTimestamp)
            .isLessThan(readBack.raw!!.expirationTimestamp)
    }

    @Test
    fun collection_addingToA_showsUpInQueryOnB() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()
        writeHandle.store(entity1)
        writeHandle.store(entity2)

        val readHandle = readHandleManager.createCollectionHandle()

        assertThat(writeHandle.fetchAll()).containsExactly(entity1, entity2)

        // Ensure that the query argument is being used.
        assertThat(readHandle.query(21.0)).containsExactly(entity1)
        assertThat(readHandle.query(22.0)).containsExactly(entity2)

        // Ensure that an empty set of results can be returned.
        assertThat(readHandle.query(60.0)).isEmpty()
    }

    @Test
    fun collection_dataConsideredInvalidByRefinementThrows() = testRunner {
        val timeTraveler = Person("doctor1", "the Doctor", -900, false, null, null)
        val writeHandle = writeHandleManager.createCollectionHandle()
        writeHandle.store(entity1)
        writeHandle.store(entity2)

        assertThat(writeHandle.fetchAll()).containsExactly(entity1, entity2)

        assertSuspendingThrows(IllegalArgumentException::class) {
            writeHandle.store(timeTraveler)
        }
    }

    @Test
    fun collection_queryWithInvalidQueryThrows() = testRunner {
        val writeHandle = writeHandleManager.createCollectionHandle()
        writeHandle.store(entity1)
        writeHandle.store(entity2)

        assertThat(writeHandle.fetchAll()).containsExactly(entity1, entity2)
        assertSuspendingThrows(ClassCastException::class) {
            writeHandle.query("44")
        }
    }


    @Test
    open fun collection_referenceLiveness() = runBlocking {
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
        writeEntityHandle.store(modEntity1)
        writeEntityHandle.store(modEntity2)

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

        // Reference should be dead.
        // TODO(b/152436411): The reference should dereference to null, but in fact dereferences to
        // a RawEntity full of nulls.
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

    private suspend fun Handle.awaitReady() {
        val deferred = CompletableDeferred<Unit>()
        onReady {
            deferred.complete(Unit)
        }
        deferred.await()
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
    ) as ReadWriteSingletonHandle<Person>

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
            HandleMode.ReadWrite,
            HandleContainerType.Collection,
            entitySpec
        ),
        storageKey,
        ttl
    ) as ReadWriteQueryCollectionHandle<T, Any>

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
    ) as ReadWriteSingletonHandle<Reference<Person>>

    private suspend fun EntityHandleManager.createReferenceCollectionHandle(
        storageKey: StorageKey = collectionRefKey,
        name: String = "referenceCollectionReadHandle",
        ttl: Ttl = Ttl.Infinite
    ) = createHandle(
        HandleSpec(
            name,
            HandleMode.ReadWrite,
            HandleContainerType.Collection,
            Person,
            HandleDataType.Reference
        ),
        storageKey,
        ttl
    ) as ReadWriteQueryCollectionHandle<Reference<Person>, Any>
}
