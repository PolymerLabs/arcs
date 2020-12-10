package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.data.EntityType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testStorageEndpointManager
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class LocalStorageEndpointManagerTest {

  @Test
  fun manager_get_createsNewStore() = runTest {
    val endpointManager = testStorageEndpointManager(this)

    val firstEndpoint = endpointManager.get(storageOptionsFrom(), DUMMY_CALLBACK)

    val secondEndpoint = endpointManager.get(
      storageOptionsFrom("newKey"),
      DUMMY_CALLBACK
    )

    assertThat((firstEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
      .isNotEqualTo((secondEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
  }

  @Test
  fun manager_get_cachesStore() = runTest {
    val endpointManager = testStorageEndpointManager(this)

    val firstEndpoint = endpointManager.get(storageOptionsFrom(), DUMMY_CALLBACK)

    val secondEndpoint = endpointManager.get(storageOptionsFrom(), DUMMY_CALLBACK)

    assertThat((firstEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
      .isSameInstanceAs((secondEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
  }

  @Test
  fun manager_reset_closesStores() = runTest {
    val endpointManager = testStorageEndpointManager(this)

    val endpoint = endpointManager.get(storageOptionsFrom(), DUMMY_CALLBACK)

    endpointManager.reset()

    val store = (endpoint as LocalStorageEndpoint<*, *, *>).storeForTests
    assertThat((store as ReferenceModeStore).containerStore.closed).isTrue()
  }

  @Test
  fun manager_reset_emptiesStoreCache() = runTest {
    val endpointManager = testStorageEndpointManager(this)

    val firstEndpoint = endpointManager.get(storageOptionsFrom(), DUMMY_CALLBACK)

    endpointManager.reset()

    val secondEndpoint = endpointManager.get(storageOptionsFrom(), DUMMY_CALLBACK)

    assertThat((firstEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
      .isNotEqualTo((secondEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
  }

  companion object {
    private val DUMMY_CALLBACK: ProxyCallback<CrdtData, CrdtOperationAtTime, Any> = {}

    private fun runTest(block: suspend CoroutineScope.() -> Unit): Unit = runBlockingTest {
      block()
    }

    private fun storageOptionsFrom(keyName: String = "entity"): StoreOptions {
      return StoreOptions(
        storageKey = ReferenceModeStorageKey(
          RamDiskStorageKey("backing"),
          RamDiskStorageKey(keyName)
        ),
        type = SingletonType(
          EntityType(
            Schema(
              setOf(SchemaName("TestType")),
              fields = SchemaFields(
                emptyMap(), emptyMap()
              ),
              hash = "abcdef"
            )
          )
        )
      )
    }
  }
}
