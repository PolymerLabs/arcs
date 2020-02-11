package arcs.core.storage.handle

import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.toReferencable
import arcs.core.storage.ActiveStore
import arcs.core.storage.DirectStore
import arcs.core.storage.DriverFactory
import arcs.core.storage.StoreOptions
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class HandleManagerTest {
    val entity1 = RawEntity("empty", singletons=mapOf(
        "name" to "Jason".toReferencable(),
        "age" to 21.toReferencable(),
        "is_cool" to false.toReferencable()
    ), collections=emptyMap())

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

    @Before
    fun setup() {
        DriverFactory.register(RamDiskDriverProvider())
    }

    fun handleManagerTest(block: suspend (HandleManager) -> Unit) {
        val hm = HandleManager(object : ActivationFactoryFactory {
            override fun singletonFactory() = object : SingletonActivationFactory<RawEntity> {
                override suspend fun invoke(options: StoreOptions<SingletonData<RawEntity>, SingletonOp<RawEntity>, RawEntity?>): ActiveStore<SingletonData<RawEntity>, SingletonOp<RawEntity>, RawEntity?> {
                    val driver = DriverFactory.getDriver<SingletonData<RawEntity>>(options.storageKey, options.existenceCriteria)
                    return DirectStore<SingletonData<RawEntity>, SingletonOp<RawEntity>, RawEntity?>(options, CrdtSingleton(), driver!!)
                }
            }

            override fun setFactory() = object : SetActivationFactory<RawEntity> {
                override suspend fun invoke(options: StoreOptions<SetData<RawEntity>, SetOp<RawEntity>, Set<RawEntity>>): ActiveStore<SetData<RawEntity>, SetOp<RawEntity>, Set<RawEntity>> {
                    val driver = DriverFactory.getDriver<SetData<RawEntity>>(options.storageKey, options.existenceCriteria)
                    return DirectStore<SetData<RawEntity>, SetOp<RawEntity>, Set<RawEntity>>(options, CrdtSet(), driver!!)
                }
            }
        })
        runBlocking {
            block(hm)
        }
    }

    @Test
    fun testCreateSingletonHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val singletonHandle = hm.singletonHandle(RamDiskStorageKey("foo"), schema)
            singletonHandle.set(entity1)

            // Now read back from a different handle
            val readbackHandle = hm.singletonHandle(RamDiskStorageKey("foo"), schema)
            val readBack = readbackHandle.fetch()
            assertThat(readBack).isEqualTo(entity1)
        }
    }

    @Test
    fun testCreateSetHandle() = runBlockingTest {
        handleManagerTest { hm ->
            val setHandle = hm.setHandle(RamDiskStorageKey("fooset"), schema)
            setHandle.store(entity1)
        }
    }
}
