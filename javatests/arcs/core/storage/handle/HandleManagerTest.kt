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
import arcs.core.storage.driver.RamDiskStorageKey
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

    private val singletonKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = RamDiskStorageKey("single-ent")
    )

    private val setKey = ReferenceModeStorageKey(
        backingKey = backingKey,
        storageKey = RamDiskStorageKey("set-ent")
    )

    @Before
    fun setup() {
        Log.level = Log.Level.Debug
        RamDisk.clear()
        DriverFactory.register(RamDiskDriverProvider())
    }

    @Test
    fun testCreateSingletonHandle() = handleManagerTest { hm ->
        val singletonHandle = hm.singletonHandle(singletonKey, schema)
        singletonHandle.store(entity1)

        // Now read back from a different handle
        val readbackHandle = hm.singletonHandle(singletonKey, schema)
        val readBack = readbackHandle.fetch()
        assertThat(readBack).isEqualTo(entity1)
    }

    @Test
    fun testDereferencingFromSingletonEntity() = handleManagerTest { hm ->
        val singleton1Handle = hm.singletonHandle(singletonKey, schema)
        val singleton1Handle2 = hm.singletonHandle(singletonKey, schema)
        singleton1Handle.store(entity1)

        // Create a second handle for the second entity, so we can store it.
        val singleton2Handle = hm.singletonHandle(
            ReferenceModeStorageKey(backingKey, RamDiskStorageKey("entity2")),
            schema
        )
        val singleton2Handle2 = hm.singletonHandle(
            ReferenceModeStorageKey(backingKey, RamDiskStorageKey("entity2")),
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
    fun testCreateSetHandle() = handleManagerTest { hm ->
        val setHandle = hm.setHandle(setKey, schema)
        setHandle.store(entity1)
        setHandle.store(entity2)

        // Now read back from a different handle
        val readbackHandle = hm.setHandle(setKey, schema)
        val readBack = readbackHandle.fetchAll()
        assertThat(readBack).containsExactly(entity1, entity2)
    }

    @Test
    fun testDereferencingFromSetHandleEntity() = handleManagerTest { hm ->
        val setHandle = hm.setHandle(setKey, schema)
        setHandle.store(entity1)
        setHandle.store(entity2)

        val secondHandle = hm.setHandle(setKey, schema)
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
