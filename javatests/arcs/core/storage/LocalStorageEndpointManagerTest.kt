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
import kotlinx.coroutines.withTimeout
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class LocalStorageEndpointManagerTest {

  private val emptyCallback: ProxyCallback<CrdtData, CrdtOperationAtTime, Any> = {}

  private val storageKey = ReferenceModeStorageKey(
    RamDiskStorageKey("backing"),
    RamDiskStorageKey("entity")
  )

  val type = SingletonType(
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

  private val storageOptions = StoreOptions(storageKey, type)

  private fun runTest(block: suspend CoroutineScope.() -> Unit): Unit = runBlockingTest {
    block()
  }

  @Test
  fun manager_get_createsNewStore() = runTest {
    val endpointManager = testStorageEndpointManager(this)

    val firstEndpoint = withTimeout(15000) {
      endpointManager.get(storageOptions, emptyCallback)
    }

    val secondEndpoint = withTimeout(15000) {
      endpointManager.get(
        StoreOptions(
          storageKey.copy(storageKey = RamDiskStorageKey("newKey")),
          type
        ),
        emptyCallback
      )
    }

    assertThat((firstEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
      .isNotEqualTo((secondEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
  }

  @Test
  fun manager_get_cachesStore() = runTest {
    val endpointManager = testStorageEndpointManager(this)

    val firstEndpoint = withTimeout(15000) {
      endpointManager.get(storageOptions, emptyCallback)
    }

    val secondEndpoint = withTimeout(15000) {
      endpointManager.get(storageOptions, emptyCallback)
    }

    assertThat((firstEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
      .isSameInstanceAs((secondEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
  }

  @Test
  fun manager_reset_closesStores() = runTest {
    val endpointManager = testStorageEndpointManager(this)

    val endpoint = withTimeout(15000) {
      endpointManager.get(storageOptions, emptyCallback)
    }

    endpointManager.reset()

    val store = (endpoint as LocalStorageEndpoint<*, *, *>).storeForTests
    assertThat((store as ReferenceModeStore).containerStore.closed).isTrue()
  }

  @Test
  fun manager_reset_emptiesStoreCache() = runTest {
    val endpointManager = testStorageEndpointManager(this)

    val firstEndpoint = withTimeout(15000) {
      endpointManager.get(storageOptions, emptyCallback)
    }

    endpointManager.reset()

    val secondEndpoint = withTimeout(15000) {
      endpointManager.get(storageOptions, emptyCallback)
    }

    assertThat((firstEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
      .isNotEqualTo((secondEndpoint as LocalStorageEndpoint<*, *, *>).storeForTests)
  }
}
