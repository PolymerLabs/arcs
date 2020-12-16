package arcs.core.storage.testutil

import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.entity.testutil.RestrictedDummyEntity
import arcs.core.storage.ActiveStore
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StoreOptions
import arcs.core.storage.UntypedProxyMessage
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.RefModeStoreOutput
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test

private typealias ProxyMessageOperations =
  ProxyMessage.Operations<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>

@Suppress("UNCHECKED_CAST")
@OptIn(ExperimentalCoroutinesApi::class)
class RefModeStoreHelperTest {
  private lateinit var capturedProxyMessages: MutableList<ProxyMessageOperations>
  private lateinit var fakeStore: ActiveStore<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>

  @Before
  fun setUp() {
    capturedProxyMessages = mutableListOf()
    val storeOptions = StoreOptions(
      DummyStorageKey("abc"),
      CollectionType(EntityType(RestrictedDummyEntity.SCHEMA))
    )
    fakeStore = object : NoopActiveStore(storeOptions) {
      override suspend fun onProxyMessage(message: UntypedProxyMessage) {
        capturedProxyMessages.add(message as ProxyMessageOperations)
      }
    } as ActiveStore<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>
  }

  @Test
  fun sendUpdateOp_incrementsVersionMap() = runBlockingTest {
    val helper = RefModeStoreHelper(ACTOR, fakeStore)

    helper.sendUpdateOp(DUMMY_ENTITY1)
    helper.sendUpdateOp(DUMMY_ENTITY2)

    assertProxyMessages(
      RefModeStoreOp.SingletonUpdate(ACTOR, VersionMap(ACTOR to 1), DUMMY_ENTITY1),
      RefModeStoreOp.SingletonUpdate(ACTOR, VersionMap(ACTOR to 2), DUMMY_ENTITY2)
    )
  }

  @Test
  fun sendAddOp_incrementsVersionMap() = runBlockingTest {
    val helper = RefModeStoreHelper(ACTOR, fakeStore)

    helper.sendAddOp(DUMMY_ENTITY1)
    helper.sendAddOp(DUMMY_ENTITY2)

    assertProxyMessages(
      RefModeStoreOp.SetAdd(ACTOR, VersionMap(ACTOR to 1), DUMMY_ENTITY1),
      RefModeStoreOp.SetAdd(ACTOR, VersionMap(ACTOR to 2), DUMMY_ENTITY2)
    )
  }

  @Test
  fun sendRemoveOp_doesNotIncrementVersionMap() = runBlockingTest {
    val helper = RefModeStoreHelper(ACTOR, fakeStore)

    helper.sendAddOp(DUMMY_ENTITY1)
    helper.sendRemoveOp(DUMMY_ENTITY1.id)

    assertProxyMessages(
      RefModeStoreOp.SetAdd(ACTOR, VersionMap(ACTOR to 1), DUMMY_ENTITY1),
      RefModeStoreOp.SetRemove(ACTOR, VersionMap(ACTOR to 1), DUMMY_ENTITY1.id)
    )
  }

  @Test
  fun sendSingletonClearOp_doesNotIncrementVersionMap() = runBlockingTest {
    val helper = RefModeStoreHelper(ACTOR, fakeStore)

    helper.sendUpdateOp(DUMMY_ENTITY1)
    helper.sendSingletonClearOp()

    assertProxyMessages(
      RefModeStoreOp.SingletonUpdate(ACTOR, VersionMap(ACTOR to 1), DUMMY_ENTITY1),
      RefModeStoreOp.SingletonClear(ACTOR, VersionMap(ACTOR to 1))
    )
  }

  @Test
  fun sendCollectionClearOp_doesNotIncrementVersionMap() = runBlockingTest {
    val helper = RefModeStoreHelper(ACTOR, fakeStore)

    helper.sendAddOp(DUMMY_ENTITY1)
    helper.sendCollectionClearOp()

    assertProxyMessages(
      RefModeStoreOp.SetAdd(ACTOR, VersionMap(ACTOR to 1), DUMMY_ENTITY1),
      RefModeStoreOp.SetClear(ACTOR, VersionMap(ACTOR to 1))
    )
  }

  @Test
  fun sendOps_forwardsOpsToStoreUsingCallbackToken() = runBlockingTest {
    val helper = RefModeStoreHelper(ACTOR, fakeStore, callbackToken = 123)
    val ops = arrayOf(
      RefModeStoreOp.SetAdd("a", VersionMap("a" to 1), DUMMY_ENTITY1),
      RefModeStoreOp.SetAdd("b", VersionMap("b" to 1), DUMMY_ENTITY2)
    )

    helper.sendOps(*ops)

    assertThat(capturedProxyMessages).containsExactly(
      ProxyMessageOperations(ops.toList(), id = 123)
    )
  }

  /** Checks that the [ProxyMessageOperations] sent to the store match the given [ops], in order. */
  private fun assertProxyMessages(vararg ops: RefModeStoreOp) {
    val expected = ops.map { ProxyMessageOperations(listOf(it), id = DEFAULT_CALLBACK_TOKEN) }
    assertThat(capturedProxyMessages).containsExactlyElementsIn(expected).inOrder()
  }

  private companion object {
    private const val ACTOR = "ACTOR"
    private const val DEFAULT_CALLBACK_TOKEN = 1

    private val DUMMY_ENTITY1 = RawEntity(
      id = "id1",
      singletons = emptyMap(),
      collections = emptyMap()
    )
    private val DUMMY_ENTITY2 = RawEntity(
      id = "id2",
      singletons = emptyMap(),
      collections = emptyMap()
    )
  }
}
