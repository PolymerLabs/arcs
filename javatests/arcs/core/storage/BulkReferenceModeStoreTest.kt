package arcs.core.storage

import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSet.IOperation
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.util.toReferencable
import arcs.core.storage.driver.testutil.SlowRamDiskDriverProvider
import arcs.core.storage.driver.testutil.SlowVolatileMemory.MemoryOp
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.RefModeStoreOp.SetAdd
import arcs.core.storage.referencemode.RefModeStoreOutput
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testWriteBackProvider
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.CountDownLatch
import kotlin.random.Random
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("UNCHECKED_CAST")
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class BulkReferenceModeStoreTest {
  @get:Rule
  val log = LogRule()

  private lateinit var scope: CoroutineScope

  @Before
  fun setUp() {
    scope = CoroutineScope(Dispatchers.Default)
  }

  @After
  fun tearDown() {
    scope.cancel()
  }

  @Test
  fun proxyMessage_withMultipleOps_echoedToCallbacksInCorrectOrder() = runBlocking {
    DefaultDriverFactory.update(
      SlowRamDiskDriverProvider { _: MemoryOp, _: StorageKey? -> delay(Random.nextLong(10, 100)) }
    )
    val operations = (1 until 100).map {
      SetAdd("antuan", VersionMap("antuan" to it), createEntity("$it"))
    }
    val bulkMessage = OperationsMessage(operations, null)

    val sendingCrdt = CrdtSet<RawEntity>()
    val senderSynced = CompletableDeferred<Unit>()
    val receivingCrdt = CrdtSet<RawEntity>()
    val receiverSynced = CompletableDeferred<Unit>()
    val receiverCountdown = CountDownLatch(operations.size)

    operations.forEach { op -> sendingCrdt.applyOperation(op as IOperation<RawEntity>) }

    val sendingCallback = Callback { message ->
      log("Sender heard $message")
      if (message is ProxyMessage.ModelUpdate<*, *, *>) {
        sendingCrdt.merge(message.model as CrdtSet.Data<RawEntity>)
        senderSynced.complete(Unit)
      }
    }
    val receivingCallback = Callback { message ->
      log("Receiver heard $message")
      if (message is ProxyMessage.Operations<*, *, *>) {
        message.operations.forEach { op ->
          log("Applying $op to receiver")
          assertThat(receivingCrdt.applyOperation(op as IOperation<RawEntity>)).isTrue()
          receiverCountdown.countDown()
        }
      } else if (message is ProxyMessage.ModelUpdate<*, *, *>) {
        receivingCrdt.merge(message.model as CrdtSet.Data<RawEntity>)
        receiverSynced.complete(Unit)
      }
    }

    val store = createStore()
    val sendingId = store.on(sendingCallback)
    val receivingId = store.on(receivingCallback)

    log("Syncing")
    store.onProxyMessage(createSyncRequest(sendingId))
    store.onProxyMessage(createSyncRequest(receivingId))

    log("Waiting for sync")
    senderSynced.await()
    receiverSynced.await()

    log("Sending bulk message")
    withContext(Dispatchers.Default) {
      store.onProxyMessage(bulkMessage)
    }

    log("Waiting for all the messages to arrive")
    receiverCountdown.await()

    assertThat(receivingCrdt.consumerView).isEqualTo(sendingCrdt.consumerView)
  }

  @Test
  fun multiple_proxyMessages_echoedToCallbacksInCorrectOrder() = runBlocking {
    DefaultDriverFactory.update(
      SlowRamDiskDriverProvider { _: MemoryOp, _: StorageKey? -> delay(Random.nextLong(10, 100)) }
    )
    val messages = (1 until 100).map {
      OperationsMessage(
        listOf(SetAdd("allison", VersionMap("allison" to it), createEntity("$it"))),
        null
      )
    }

    val sendingCrdt = CrdtSet<RawEntity>()
    val senderSynced = CompletableDeferred<Unit>()
    val receivingCrdt = CrdtSet<RawEntity>()
    val receiverSynced = CompletableDeferred<Unit>()
    val receiverCountdown = CountDownLatch(messages.size)

    messages.forEach { op ->
      sendingCrdt.applyOperation(op.operations.first() as IOperation<RawEntity>)
    }

    val sendingCallback = Callback { message ->
      log("Sender heard $message")
      if (message is ProxyMessage.ModelUpdate<*, *, *>) {
        sendingCrdt.merge(message.model as CrdtSet.Data<RawEntity>)
        senderSynced.complete(Unit)
      }
    }
    val receivingCallback = Callback { message ->
      log("Receiver heard $message")
      if (message is ProxyMessage.Operations<*, *, *>) {
        message.operations.forEach { op ->
          log("Applying $op to receiver")
          assertThat(receivingCrdt.applyOperation(op as IOperation<RawEntity>)).isTrue()
        }
        receiverCountdown.countDown()
      } else if (message is ProxyMessage.ModelUpdate<*, *, *>) {
        receivingCrdt.merge(message.model as CrdtSet.Data<RawEntity>)
        receiverSynced.complete(Unit)
      }
    }

    val store = createStore()
    val sendingId = store.on(sendingCallback)
    val receivingId = store.on(receivingCallback)

    log("Syncing")
    store.onProxyMessage(createSyncRequest(sendingId))
    store.onProxyMessage(createSyncRequest(receivingId))

    log("Waiting for sync")
    senderSynced.await()
    receiverSynced.await()

    log("Sending bulk message")
    withContext(Dispatchers.Default) {
      messages.forEach { store.onProxyMessage(it) }
    }

    log("Waiting for all the messages to arrive")
    receiverCountdown.await()

    assertThat(receivingCrdt.consumerView).isEqualTo(sendingCrdt.consumerView)
  }

  @Test
  fun forcingSlownessOnFirstItem_stillEmitsOpsInCorrectOrder() = runBlocking {
    DefaultDriverFactory.update(
      SlowRamDiskDriverProvider { op: MemoryOp, key: StorageKey? ->
        if (op == MemoryOp.Update) {
          log("Heard update for $key")
          if (key == BACKING_KEY.childKeyWithComponent("1")) {
            delay(1000)
          }
          log("Finishing update for $key")
        }
      }
    )

    val firstMessage =
      OperationsMessage(
        listOf(SetAdd("allison", VersionMap("allison" to 1), createEntity("1"))),
        null
      )
    val secondMessage =
      OperationsMessage(
        listOf(SetAdd("allison", VersionMap("allison" to 2), createEntity("2"))),
        null
      )

    val sendingCrdt = CrdtSet<RawEntity>()
    val senderSynced = CompletableDeferred<Unit>()
    val receivingCrdt = CrdtSet<RawEntity>()
    val receiverSynced = CompletableDeferred<Unit>()
    val receiverCountdown = CountDownLatch(2)

    sendingCrdt.applyOperation(firstMessage.operations.first() as IOperation<RawEntity>)
    sendingCrdt.applyOperation(secondMessage.operations.first() as IOperation<RawEntity>)

    val sendingCallback = Callback { message ->
      log("Sender heard $message")
      if (message is ProxyMessage.ModelUpdate<*, *, *>) {
        sendingCrdt.merge(message.model as CrdtSet.Data<RawEntity>)
        senderSynced.complete(Unit)
      }
    }
    val receivingCallback = Callback { message ->
      log("Receiver heard $message")
      if (message is ProxyMessage.Operations<*, *, *>) {
        message.operations.forEach { op ->
          log("Applying $op to receiver")
          assertThat(receivingCrdt.applyOperation(op as IOperation<RawEntity>)).isTrue()
        }
        receiverCountdown.countDown()
      } else if (message is ProxyMessage.ModelUpdate<*, *, *>) {
        receivingCrdt.merge(message.model as CrdtSet.Data<RawEntity>)
        receiverSynced.complete(Unit)
      }
    }

    val store = createStore()
    val sendingId = store.on(sendingCallback)
    val receivingId = store.on(receivingCallback)

    log("Syncing")
    store.onProxyMessage(createSyncRequest(sendingId))
    store.onProxyMessage(createSyncRequest(receivingId))

    log("Waiting for sync")
    senderSynced.await()
    receiverSynced.await()

    log("Sending bulk message")
    withContext(Dispatchers.Default) {
      store.onProxyMessage(firstMessage)
      store.onProxyMessage(secondMessage)
    }

    log("Waiting for all the messages to arrive")
    receiverCountdown.await()

    assertThat(receivingCrdt.consumerView).isEqualTo(sendingCrdt.consumerView)
  }

  private suspend fun createStore(): ReferenceModeStore {
    val options = StoreOptions(STORAGE_KEY, STORE_TYPE)
    return ReferenceModeStore.create(options, scope, ::testWriteBackProvider, null)
  }

  private fun createEntity(id: String): RawEntity {
    return RawEntity(
      id,
      singletons = mapOf("foo" to "bar".toReferencable()),
      creationTimestamp = 0,
      expirationTimestamp = Long.MAX_VALUE
    )
  }

  private fun createSyncRequest(
    callbackId: Int
  ): ProxyMessage<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput> {
    return ProxyMessage.SyncRequest(callbackId)
  }

  companion object {
    private val BACKING_KEY = RamDiskStorageKey("backing")
    private val CONTAINER_KEY = RamDiskStorageKey("container")
    private val STORAGE_KEY = ReferenceModeStorageKey(BACKING_KEY, CONTAINER_KEY)
    private val STORE_TYPE =
      CollectionType(
        EntityType(
          Schema(
            emptySet(),
            SchemaFields(mapOf("foo" to FieldType.Text), emptyMap()),
            "abc123"
          )
        )
      )
  }
}

private fun Callback(
  fn: suspend (ProxyMessage<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>) -> Unit
) = fn

private typealias OperationsMessage =
  ProxyMessage.Operations<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>
