package arcs.core.entity

import arcs.core.common.Id.Generator
import arcs.core.common.ReferenceId
import arcs.core.data.FieldType
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.host.EntityHandleManager
import arcs.core.storage.DriverFactory
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.toReference
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Ignore
import org.junit.Test

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
open class HandleManagerTestBase {
    private val backingKey = RamDiskStorageKey("entities")

    data class Person(
        override val entityId: ReferenceId,
        val name: String,
        val age: Int,
        val isCool: Boolean,
        val bestFriend: Reference
    ) : Entity {

        override fun ensureIdentified(idGenerator: Generator, handleName: String) {}

        override fun serialize() = RawEntity(
            entityId,
            singletons = mapOf(
                "name" to name.toReferencable(),
                "age" to age.toReferencable(),
                "is_cool" to isCool.toReferencable(),
                "best_friend" to bestFriend
            ),
            collections = emptyMap()
        )

        override fun reset() {
            TODO("Not yet implemented")
        }
    }

    val entity1 = Person("entity1", "Jason", 21, false, Reference("entity2", backingKey,null))
    val entity2 = Person("entity2", "Jason", 22, true, Reference("entity1", backingKey, null))

    val entitySpec = object : EntitySpec<Person> {
        @Suppress("UNCHECKED_CAST")
        override fun deserialize(data: RawEntity) = Person(
            entityId = data.id,
            name = (data.singletons["name"] as ReferencablePrimitive<String>).value,
            age = (data.singletons["age"] as ReferencablePrimitive<Int>).value,
            isCool = (data.singletons["is_cool"] as ReferencablePrimitive<Boolean>).value,
            bestFriend = data.singletons["best_friend"]!!.toReference(backingKey, null)
        )

        override val SCHEMA = Schema(
            listOf(SchemaName("Person")),
            SchemaFields(
                singletons = mapOf(
                    "name" to FieldType.Text,
                    "age" to FieldType.Number,
                    "is_cool" to FieldType.Boolean,
                    "best_friend" to FieldType.EntityRef("1234acf")
                ),
                collections = emptyMap()
            ),
            "1234acf"
        )
    }

    private val singletonRefKey = RamDiskStorageKey("single-ent")
    private val singletonKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = singletonRefKey
    )

    private val setRefKey = RamDiskStorageKey("set-ent")
    private val setKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = setRefKey
    )


    lateinit var readHandleManager: EntityHandleManager
    lateinit var writeHandleManager: EntityHandleManager

    open var testRunner = { block: suspend CoroutineScope.() -> Unit ->
        runBlockingTest { this.block() }
    }

    @Before
    fun setup() {
        RamDisk.clear()
        DriverFactory.register(RamDiskDriverProvider())
    }

    @Test
    fun singleton_writeAndReadBack() = testRunner {
        val writeHandle = createWriteSingletonHandle()
        writeHandle.store(entity1)

        // Now read back from a different handle
        val readHandle = createReadSingletonHandle()
        val readBack = readHandle.fetch()
        assertThat(readBack).isEqualTo(entity1)
    }

    @Test
    open fun singleton_writeAndOnUpdate() = testRunner {
        val writeHandle = createWriteSingletonHandle()

        // Now read back from a different handle
        val readHandle = createReadSingletonHandle()
        val updateDeferred = CompletableDeferred<Person?>()
        readHandle.onUpdate {
            updateDeferred.complete(it)
        }
        writeHandle.store(entity1)
        assertThat(updateDeferred.await()).isEqualTo(entity1)
    }

    @Test
    @Ignore("Fix when references are added in entity handles")
    open fun singleton_referenceLiveness() = testRunner {
        /*
        val writeHandle = createWriteReferenceSingletonHandle()
        val entity1Ref = writeHandle.createReference(entity1)
        writeHandle.store(entity1Ref)

        // Now read back from a different handle
        val readbackHandle = readHandleManager.referenceSingletonHandle(singletonRefKey, schema)
        val readBack = readbackHandle.fetch()!!
        assertThat(readBack).isEqualTo(entity1Ref)

        // Reference should be dead.
        assertThat(readBack.isAlive(coroutineContext)).isFalse()
        assertThat(readBack.isDead(coroutineContext)).isTrue()

        // Now write the entity via a different handle
        val entityWriteHandle = writeHandleManager.rawEntitySingletonHandle(singletonKey, schema, "entHandle")
        entityWriteHandle.store(entity1)

        // Reference should be alive.
        assertThat(readBack.isAlive(coroutineContext)).isTrue()
        assertThat(readBack.isDead(coroutineContext)).isFalse()

        // Now dereference our read-back reference.
        assertThat(readBack.dereference(coroutineContext)).isEqualTo(entity1)

        val modEntity1 = entity1.copy(
            singletons = entity1.singletons + ("name" to "Ben".toReferencable())
        )
        entityWriteHandle.store(modEntity1)

        // Reference should still be alive.
        assertThat(readBack.isAlive(coroutineContext)).isTrue()
        assertThat(readBack.isDead(coroutineContext)).isFalse()

        // Now dereference our read-back reference, should now be modEntity1
        assertThat(readBack.dereference(coroutineContext)).isEqualTo(modEntity1)
         */
    }

    @Test
    @Ignore("Fix when references are added in entity handles")
    fun singleton_dereferenceEntity() = testRunner {
        val writeHandle = createWriteSingletonHandle()
        val readHandle = createReadSingletonHandle()
        writeHandle.store(entity1)

        // Create a second handle for the second entity, so we can store it.
        val storageKey = ReferenceModeStorageKey(backingKey, RamDiskStorageKey("entity2"))
        val refWriteHandle = createWriteSingletonHandle(storageKey, "ortherWriteHandle")
        val refReadHandle = createReadSingletonHandle(storageKey, "otherReadHandle")

        refWriteHandle.store(entity2)

        // Now read back entity1, and dereference its best_friend.
        val dereferencedEntity2 =
            (readHandle.fetch()!!.bestFriend)
                .also {
                    // Check that it's alive
                    assertThat(it.isAlive(coroutineContext)).isTrue()
                }
                .dereference(coroutineContext)
        assertThat(dereferencedEntity2).isEqualTo(entity2)

        // Do the same for entity2's best_friend
        val dereferencedEntity1 =
            (refReadHandle.fetch()!!.bestFriend as Reference)
                .dereference(coroutineContext)
        assertThat(dereferencedEntity1).isEqualTo(entity1)
    }

    @Test
    fun collection_writeAndReadBack() = testRunner {
        val writeHandle = createWriteCollectionHandle()
        writeHandle.store(entity1)
        writeHandle.store(entity2)

        // Now read back from a different handle
        val readHandle = createReadCollectionHandle()
        val readBack = readHandle.fetchAll()
        assertThat(readBack).containsExactly(entity1, entity2)
    }

    @Test
    open fun collection_writeAndOnUpdate() = testRunner {
        val writeHandle = createWriteCollectionHandle()

        // Now read back from a different handle
        val readHandle = createReadCollectionHandle()
        val updateDeferred = CompletableDeferred<Set<Person>>()
        writeHandle.store(entity1)
        readHandle.onUpdate {
            updateDeferred.complete(it)
        }
        writeHandle.store(entity2)
        assertThat(updateDeferred.await()).containsExactly(entity1, entity2)
    }

    @Test
    @Ignore("Fix when references are added in entity handles")
    open fun collection_referenceLiveness() = testRunner {
        /*
        val writeHandle = writeHandleManager.referenceCollectionHandle(singletonRefKey, schema)
        val entity1Ref = writeHandle.createReference(entity1, backingKey)
        val entity2Ref = writeHandle.createReference(entity2, backingKey)
        writeHandle.store(entity1Ref)
        writeHandle.store(entity2Ref)

        // Now read back from a different handle
        val readHandle = readHandleManager.referenceCollectionHandle(singletonRefKey, schema)
        val readBack = readHandle.fetchAll()
        assertThat(readBack).containsExactly(entity1Ref, entity2Ref)

        // References should be dead.
        val readBackEntity1Ref = readBack.find { it.id == entity1.id }!!
        val readBackEntity2Ref = readBack.find { it.id == entity2.id }!!
        assertThat(readBackEntity1Ref.isAlive(coroutineContext)).isFalse()
        assertThat(readBackEntity1Ref.isDead(coroutineContext)).isTrue()
        assertThat(readBackEntity2Ref.isAlive(coroutineContext)).isFalse()
        assertThat(readBackEntity2Ref.isDead(coroutineContext)).isTrue()

        // Now write the entity via a different handle
        val entityHandle = writeHandleManager.rawEntityCollectionHandle(singletonKey, schema, "entHandle")
        entityHandle.store(entity1)
        entityHandle.store(entity2)

        // References should be alive.
        assertThat(readBackEntity1Ref.isAlive(coroutineContext)).isTrue()
        assertThat(readBackEntity1Ref.isDead(coroutineContext)).isFalse()
        assertThat(readBackEntity2Ref.isAlive(coroutineContext)).isTrue()
        assertThat(readBackEntity2Ref.isDead(coroutineContext)).isFalse()

        // Now dereference our read-back references.
        assertThat(readBackEntity1Ref.dereference(coroutineContext)).isEqualTo(entity1)
        assertThat(readBackEntity2Ref.dereference(coroutineContext)).isEqualTo(entity2)

        // Now mutate the entities
        val modEntity1 = entity1.copy(
            singletons = entity1.singletons + ("name" to "Ben".toReferencable())
        )
        entityHandle.store(modEntity1)

        val modEntity2 = entity2.copy(
            singletons = entity2.singletons + ("name" to "Ben".toReferencable())
        )
        entityHandle.store(modEntity2)

        // Now dereference our read-back references.
        assertThat(readBackEntity1Ref.dereference(coroutineContext)).isEqualTo(modEntity1)
        assertThat(readBackEntity2Ref.dereference(coroutineContext)).isEqualTo(modEntity2)
         */
    }

    @Test
    @Ignore("Fix when references are added in entity handles")
    fun collection_entityDereference() = testRunner {
        val writeHandle = createWriteCollectionHandle()
        writeHandle.store(entity1)
        writeHandle.store(entity2)

        val readHandle = createReadCollectionHandle()
        readHandle.fetchAll().also { assertThat(it).hasSize(2) }.forEach { entity ->
            val expectedBestFriend = if (entity.entityId == "entity1") entity2 else entity1
            val actualBestFriend = entity.bestFriend.dereference(coroutineContext)
            assertThat(actualBestFriend).isEqualTo(expectedBestFriend)
        }
    }

    private suspend fun createWriteSingletonHandle(
        storageKey: StorageKey = singletonKey,
        name: String = "singletonWriteHandle"
    ) = writeHandleManager.createSingletonHandle(
        HandleMode.ReadWrite,
        name,
        entitySpec,
        storageKey
    ) as ReadWriteSingletonHandle<Person>

    private suspend fun createReadSingletonHandle(
        storageKey: StorageKey = singletonKey,
        name: String = "singletonReadHandle"
    ) = readHandleManager.createSingletonHandle(
        HandleMode.ReadWrite,
        name,
        entitySpec,
        storageKey
    ) as ReadWriteSingletonHandle<Person>

    private suspend fun createWriteReferenceSingletonHandle(
        storageKey: StorageKey = singletonRefKey,
        name: String = "singletonRefWriteHandle"
    ) = writeHandleManager.createSingletonHandle(
        HandleMode.ReadWrite,
        name,
        entitySpec,
        storageKey
    ) as ReadWriteSingletonHandle<Person>

    private suspend fun createReadReferenceSingletonHandle(
        storageKey: StorageKey = singletonRefKey,
        name: String = "singletonRefReadHandle"
    ) = readHandleManager.createSingletonHandle(
        HandleMode.ReadWrite,
        name,
        entitySpec,
        storageKey
    ) as ReadWriteSingletonHandle<Person>

    private suspend fun createWriteCollectionHandle(
        storageKey: StorageKey = setKey,
        name: String = "collectionWriteHandle"
    ) = writeHandleManager.createCollectionHandle(
        HandleMode.ReadWrite,
        name,
        entitySpec,
        storageKey
    ) as ReadWriteCollectionHandle<Person>

    private suspend fun createReadCollectionHandle(
        storageKey: StorageKey = setKey,
        name: String = "collectionReadHandle"
    ) = readHandleManager.createCollectionHandle(
        HandleMode.ReadWrite,
        name,
        entitySpec,
        storageKey
    ) as ReadWriteCollectionHandle<Person>

    private suspend fun createWriteReferenceCollectionHandle(
        storageKey: StorageKey = setRefKey,
        name: String = "collectionRefWriteHandle"
    ) = writeHandleManager.createCollectionHandle(
        HandleMode.ReadWrite,
        name,
        entitySpec,
        storageKey
    ) as ReadWriteCollectionHandle<Person>

    private suspend fun createReadReferenceCollectionHandle(
        storageKey: StorageKey = setRefKey,
        name: String = "collectionRefReadHandle"
    ) = readHandleManager.createCollectionHandle(
        HandleMode.ReadWrite,
        name,
        entitySpec,
        storageKey
    ) as ReadWriteCollectionHandle<Person>
}
