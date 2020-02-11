package arcs.core.storage.handle

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
import arcs.core.storage.DriverFactory
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Log
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


@ExperimentalHandleApi
@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class HandleManagerTest {
    val entity1 = RawEntity(
        "entity1",
        singletons=mapOf(
            "name" to "Jason".toReferencable(),
            "age" to 21.toReferencable(),
            "is_cool" to false.toReferencable()
        ),
        collections=emptyMap()
    )

    val entity2 = RawEntity(
        "entity2",
        singletons=mapOf(
            "name" to "Jason".toReferencable(),
            "age" to 22.toReferencable(),
            "is_cool" to true.toReferencable()
        ),
        collections=emptyMap()
    )

    private val schema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(
            singletons = mapOf(
                "name" to FieldType.Text,
                "age" to FieldType.Number,
                "is_cool" to FieldType.Boolean
            ),
            collections = emptyMap()
        ),
        SchemaDescription(),
        "1234acf"
    )

    private val singletonKey = ReferenceModeStorageKey(
        backingKey = RamDiskStorageKey("single-back"),
        storageKey = RamDiskStorageKey("single-ent")
    )

    private val setKey = ReferenceModeStorageKey(
        backingKey = RamDiskStorageKey("set-back"),
        storageKey = RamDiskStorageKey("set-ent")
    )

    @Before
    fun setup() {
        Log.level = Log.Level.Debug
        DriverFactory.register(RamDiskDriverProvider())
    }

    @Test
    fun testCreateSingletonHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val singletonHandle = hm.singletonHandle(singletonKey, schema)
            singletonHandle.set(entity1)

            // Now read back from a different handle
            val readbackHandle = hm.singletonHandle(singletonKey, schema)
            val readBack = readbackHandle.fetch()
            assertThat(readBack).isEqualTo(entity1)
        }
    }

    @Test
    fun testCreateSetHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val setHandle = hm.setHandle(setKey, schema)
            setHandle.store(entity1)
            setHandle.store(entity2)

            // Now read back from a different handle
            val readbackHandle = hm.setHandle(setKey, schema)
            val readBack = readbackHandle.value()
            assertThat(readBack).containsExactly(entity1, entity2)
        }
    }

    private fun handleManagerTest(block: suspend (HandleManager) -> Unit) {
        val hm = HandleManager()
        runBlocking {
            block(hm)
        }
    }
}
