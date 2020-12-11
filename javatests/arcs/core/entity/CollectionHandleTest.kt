package arcs.core.entity

import arcs.core.crdt.CrdtSet.Operation
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.entity.testutil.StorableReferencableEntity
import arcs.core.entity.testutil.mockCollectionStorageProxy
import arcs.core.entity.testutil.mockStorageAdapter
import com.nhaarman.mockitokotlin2.eq
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

// THIS IS A TEST!
@OptIn(ExperimentalCoroutinesApi::class)
@Suppress("DeferredResultUnused")
@RunWith(JUnit4::class)
class CollectionHandleTest {
  private fun createHandle(
    proxy: CollectionProxy<StorableReferencableEntity> = mockCollectionStorageProxy(),
    storageAdapter: StorageAdapter<StorableReferencableEntity, StorableReferencableEntity> =
      mockStorageAdapter()
  ): CollectionHandle<StorableReferencableEntity, StorableReferencableEntity> {
    val config = CollectionHandle.Config(
      HANDLE_NAME,
      HandleSpec(
        "handle",
        HandleMode.ReadWriteQuery,
        CollectionType(EntityType(StorableReferencableEntity.SCHEMA)),
        emptySet()
      ),
      proxy,
      storageAdapter,
      mock<EntityDereferencerFactory>(),
      "particle"
    )
    return CollectionHandle(config)
  }

  @Test
  fun storeAll() = runBlockingTest {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(proxy = proxy)
    val entity1 = StorableReferencableEntity("1")
    val entity2 = StorableReferencableEntity("2")
    val entity3 = StorableReferencableEntity("3")
    val entity4 = StorableReferencableEntity("4")

    val items = listOf(entity1, entity2, entity3, entity4)

    val result = handle.storeAll(items)
    result.join()

    verify(proxy).applyOps(
      eq(
        listOf(
          Operation.Add(
            HANDLE_NAME,
            VersionMap().also { it[HANDLE_NAME] = 1 },
            entity1
          ),
          Operation.Add(
            HANDLE_NAME,
            VersionMap().also { it[HANDLE_NAME] = 2 },
            entity2
          ),
          Operation.Add(
            HANDLE_NAME,
            VersionMap().also { it[HANDLE_NAME] = 3 },
            entity3
          ),
          Operation.Add(
            HANDLE_NAME,
            VersionMap().also { it[HANDLE_NAME] = 4 },
            entity4
          )
        )
      )
    )
  }

  companion object {
    private const val HANDLE_NAME = "myHandle"
  }
}
