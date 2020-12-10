package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.data.EntityType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.storage.testutil.DummyStorageKey
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

    val firstEndpoint = endpointManager.get(storageOptionsFrom(DUMMY_KEYNAME), DUMMY_CALLBACK)

    val secondEndpoint = endpointManager.get(storageOptionsFrom("newKey"), DUMMY_CALLBACK)

    assertThat(firstEndpoint.storeForTests()).isNotEqualTo(secondEndpoint.storeForTests())
  }

  @Test
  fun manager_get_cachesStore() = runTest {
    val endpointManager = testStorageEndpointManager(this)

    val firstEndpoint = endpointManager.get(storageOptionsFrom(DUMMY_KEYNAME), DUMMY_CALLBACK)

    val secondEndpoint = endpointManager.get(storageOptionsFrom(DUMMY_KEYNAME), DUMMY_CALLBACK)

    assertThat(firstEndpoint.storeForTests()).isSameInstanceAs(secondEndpoint.storeForTests())
  }

  @Test
  fun manager_reset_closesStores() = runTest {
    val endpointManager = testStorageEndpointManager(this)

    val endpoint = endpointManager.get(storageOptionsFrom(DUMMY_KEYNAME), DUMMY_CALLBACK)

    endpointManager.reset()

    val store = (endpoint as LocalStorageEndpoint<*, *, *>).storeForTests
    assertThat((store as ReferenceModeStore).containerStore.closed).isTrue()
  }

  @Test
  fun manager_reset_emptiesStoreCache() = runTest {
    val endpointManager = testStorageEndpointManager(this)

    val firstEndpoint = endpointManager.get(storageOptionsFrom(DUMMY_KEYNAME), DUMMY_CALLBACK)

    endpointManager.reset()

    val secondEndpoint = endpointManager.get(storageOptionsFrom(DUMMY_KEYNAME), DUMMY_CALLBACK)

    assertThat(firstEndpoint.storeForTests()).isNotEqualTo(secondEndpoint.storeForTests())
  }

  companion object {

    private val DUMMY_CALLBACK: ProxyCallback<CrdtData, CrdtOperationAtTime, Any> = {}

    private val DUMMY_KEYNAME = "entity"

    private fun runTest(block: suspend CoroutineScope.() -> Unit): Unit = runBlockingTest {
      block()
    }

    private fun StorageEndpoint<*, *, *>.storeForTests(): ActiveStore<*, *, *> =
      (this as LocalStorageEndpoint<*, *, *>).storeForTests

    private fun storageOptionsFrom(keyName: String): StoreOptions {
      return StoreOptions(
        storageKey = DummyStorageKey(keyName),
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
