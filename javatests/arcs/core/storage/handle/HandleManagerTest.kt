package arcs.core.storage.handle

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
import arcs.core.storage.DriverFactory
import arcs.core.storage.Reference
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Log
import arcs.jvm.util.testutil.TimeImpl
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class HandleManagerTest {
    private val backingKey = RamDiskStorageKey("entities")

    val entity1 = RawEntity(
        "entity1",
        singletons = mapOf(
            "name" to "Jason".toReferencable(),
            "age" to 21.toReferencable(),
            "is_cool" to false.toReferencable(),
            "best_friend" to Reference("entity2", backingKey, null)
        ),
        collections = emptyMap()
    )

    val entity2 = RawEntity(
        "entity2",
        singletons = mapOf(
            "name" to "Jason".toReferencable(),
            "age" to 22.toReferencable(),
            "is_cool" to true.toReferencable(),
            "best_friend" to Reference("entity1", backingKey, null)
        ),
        collections = emptyMap()
    )

    private val schema = Schema(
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

    @Before
    fun setup() {
        Log.level = Log.Level.Debug
        RamDisk.clear()
        DriverFactory.register(RamDiskDriverProvider())
    }

    @Test
    fun testCreateRawEntitySingletonHandle() = handleManagerTest { hm ->
        val singletonHandle = hm.rawEntitySingletonHandle(singletonKey, schema)
        singletonHandle.store(entity1)

        // Now read back from a different handle
        val readbackHandle = hm.rawEntitySingletonHandle(singletonKey, schema)
        val readBack = readbackHandle.fetch()
        assertThat(readBack).isEqualTo(entity1)
    }

    @Test
    fun testCreateReferenceSingletonHandle() = handleManagerTest { hm ->
        val singletonHandle = hm.referenceSingletonHandle(singletonRefKey, schema, "refhandle")
        val entity1Ref = singletonHandle.createReference(entity1, backingKey)
        singletonHandle.store(entity1Ref)

        // Now read back from a different handle
        val readbackHandle = hm.referenceSingletonHandle(singletonRefKey, schema)
        val readBack = readbackHandle.fetch()!!
        assertThat(readBack).isEqualTo(entity1Ref)

        // Reference should be dead.
        assertThat(readBack.isAlive(coroutineContext)).isFalse()
        assertThat(readBack.isDead(coroutineContext)).isTrue()

        // Now write the entity via a different handle
        val singletonEntityHandle = hm.rawEntitySingletonHandle(singletonKey, schema, "entHandle")
        singletonEntityHandle.store(entity1)

        // Reference should be alive.
        assertThat(readBack.isAlive(coroutineContext)).isTrue()
        assertThat(readBack.isDead(coroutineContext)).isFalse()

        // Now dereference our read-back reference.
        assertThat(readBack.dereference(coroutineContext)).isEqualTo(entity1)

        val modEntity1 = entity1.copy(
            singletons = entity1.singletons + ("name" to "Ben".toReferencable())
        )
        singletonEntityHandle.store(modEntity1)

        // Reference should still be alive.
        assertThat(readBack.isAlive(coroutineContext)).isTrue()
        assertThat(readBack.isDead(coroutineContext)).isFalse()

        // Now dereference our read-back reference, should now be modEntity1
        assertThat(readBack.dereference(coroutineContext)).isEqualTo(modEntity1)
    }

    @Test
    fun testDereferencingFromSingletonEntity() = handleManagerTest { hm ->
        val singleton1Handle = hm.rawEntitySingletonHandle(singletonKey, schema)
        val singleton1Handle2 = hm.rawEntitySingletonHandle(singletonKey, schema)
        singleton1Handle.store(entity1)

        // Create a second handle for the second entity, so we can store it.
        val storageKey = ReferenceModeStorageKey(backingKey, RamDiskStorageKey("entity2"))
        val singleton2Handle = hm.rawEntitySingletonHandle(
            storageKey,
            schema
        )
        val singleton2Handle2 = hm.rawEntitySingletonHandle(
            storageKey,
            schema
        )
        singleton2Handle.store(entity2)

        // Now read back entity1, and dereference its best_friend.
        val dereferencedEntity2 =
            (singleton1Handle2.fetch()!!.singletons["best_friend"] as Reference)
                .also {
                    // Check that it's alive
                    assertThat(it.isAlive(coroutineContext)).isTrue()
                }
                .dereference(coroutineContext)
        assertThat(dereferencedEntity2).isEqualTo(entity2)

        // Do the same for entity2's best_friend
        val dereferencedEntity1 =
            (singleton2Handle2.fetch()!!.singletons["best_friend"] as Reference)
                .dereference(coroutineContext)
        assertThat(dereferencedEntity1).isEqualTo(entity1)
    }

    @Test
    fun testCreateCollectionHandle() = handleManagerTest { hm ->
        val collectionHandle = hm.rawEntityCollectionHandle(setKey, schema)
        collectionHandle.store(entity1)
        collectionHandle.store(entity2)

        // Now read back from a different handle
        val readbackHandle = hm.rawEntityCollectionHandle(setKey, schema)
        val readBack = readbackHandle.fetchAll()
        assertThat(readBack).containsExactly(entity1, entity2)
    }

    @Test
    fun testCreateReferenceCollectionHandle() = handleManagerTest { hm ->
        val collectionHandle = hm.referenceCollectionHandle(singletonRefKey, schema)
        val entity1Ref = collectionHandle.createReference(entity1, backingKey)
        val entity2Ref = collectionHandle.createReference(entity2, backingKey)
        collectionHandle.store(entity1Ref)
        collectionHandle.store(entity2Ref)

        // Now read back from a different handle
        val readbackHandle = hm.referenceCollectionHandle(singletonRefKey, schema)
        val readBack = readbackHandle.fetchAll()
        assertThat(readBack).containsExactly(entity1Ref, entity2Ref)

        // References should be dead.
        val readBackEntity1Ref = readBack.find { it.id == entity1.id }!!
        val readBackEntity2Ref = readBack.find { it.id == entity2.id }!!
        assertThat(readBackEntity1Ref.isAlive(coroutineContext)).isFalse()
        assertThat(readBackEntity1Ref.isDead(coroutineContext)).isTrue()
        assertThat(readBackEntity2Ref.isAlive(coroutineContext)).isFalse()
        assertThat(readBackEntity2Ref.isDead(coroutineContext)).isTrue()

        // Now write the entity via a different handle
        val entityHandle = hm.rawEntityCollectionHandle(singletonKey, schema, "entHandle")
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
    }

    @Test
    fun testDereferencingFromCollectionHandleEntity() = handleManagerTest { hm ->
        val collectionHandle = hm.rawEntityCollectionHandle(setKey, schema)
        collectionHandle.store(entity1)
        collectionHandle.store(entity2)

        val secondHandle = hm.rawEntityCollectionHandle(setKey, schema)
        secondHandle.fetchAll().also { assertThat(it).hasSize(2) }.forEach { entity ->
            val expectedBestFriend = if (entity.id == "entity1") entity2 else entity1
            val actualBestFriend = (entity.singletons["best_friend"] as Reference)
                .dereference(coroutineContext)
            assertThat(actualBestFriend).isEqualTo(expectedBestFriend)
        }
    }

    // TODO: Make runBlockingTest work.
    private fun handleManagerTest(
        block: suspend CoroutineScope.(HandleManager) -> Unit
    ) = runBlocking {
        val hm = HandleManager(TimeImpl())
        this@runBlocking.block(hm)
        Unit
    }
}
