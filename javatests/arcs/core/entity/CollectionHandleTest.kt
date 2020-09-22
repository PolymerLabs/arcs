package arcs.core.entity

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtSet.Operation
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.eq
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@ExperimentalCoroutinesApi
@Suppress("DeferredResultUnused")
@RunWith(JUnit4::class)
class CollectionHandleTest {
    private lateinit var proxyVersionMap: VersionMap
    private lateinit var dereferencerFactory: EntityDereferencerFactory
    private lateinit var proxy: CollectionProxy<FakeEntity>
    private lateinit var storageAdapter: StorageAdapter<FakeEntity, FakeEntity>
    private lateinit var handle: CollectionHandle<FakeEntity, FakeEntity>

    @Before
    fun setUp() {
        proxyVersionMap = VersionMap()

        proxy = mock {
            on { getVersionMap() }.then { proxyVersionMap.copy() }
            on { applyOps(any()) }.then { CompletableDeferred(true) }
            on { prepareForSync() }.then { Unit }
        }
        storageAdapter = mock {
            on { referencableToStorable(any()) }.then { it.arguments[0] as FakeEntity }
            on { storableToReferencable(any()) }.then { it.arguments[0] as FakeEntity }
        }
        dereferencerFactory = mock {
            // Maybe add mock endpoints here, if needed.
        }

        val config = CollectionHandle.Config(
            HANDLE_NAME,
            HandleSpec(
                "handle",
                HandleMode.ReadWriteQuery,
                CollectionType(EntityType(FakeEntity.SCHEMA)),
                emptySet()
            ),
            proxy,
            storageAdapter,
            dereferencerFactory,
            "particle"
        )
        handle = CollectionHandle(config)
    }

    @Test
    fun storeAll() = runBlockingTest {
        val items = listOf(
            FakeEntity("1"),
            FakeEntity("2"),
            FakeEntity("3"),
            FakeEntity("4")
        )

        val result = handle.storeAll(items)
        result.join()

        verify(proxy).applyOps(
            eq(
                listOf(
                    Operation.Add(
                        HANDLE_NAME,
                        VersionMap().also { it[HANDLE_NAME] = 1 },
                        FakeEntity("1")
                    ),
                    Operation.Add(
                        HANDLE_NAME,
                        VersionMap().also { it[HANDLE_NAME] = 2 },
                        FakeEntity("2")
                    ),
                    Operation.Add(
                        HANDLE_NAME,
                        VersionMap().also { it[HANDLE_NAME] = 3 },
                        FakeEntity("3")
                    ),
                    Operation.Add(
                        HANDLE_NAME,
                        VersionMap().also { it[HANDLE_NAME] = 4 },
                        FakeEntity("4")
                    )
                )
            )
        )
    }

    private data class FakeEntity(override val id: ReferenceId) : Storable, Referencable {
        companion object {
            val SCHEMA = Schema(
                setOf(SchemaName("FakeEntity")),
                SchemaFields(emptyMap(), emptyMap()),
                "abc123"
            )
        }
    }

    companion object {
        private const val HANDLE_NAME = "myHandle"
    }
}
