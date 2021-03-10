package arcs.core.storage

import arcs.core.crdt.CrdtCount
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.VersionMap
import arcs.core.data.CountType
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.storage.testutil.FakeDriver
import arcs.core.storage.testutil.FakeDriverProvider
import arcs.core.storage.testutil.TestStoreWriteBack
import arcs.flags.BuildFlags
import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestCoroutineDispatcher
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Assert
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class WriteOnlyDirectStoreTest {

  private val testKey: StorageKey = DummyStorageKey("key")
  lateinit var testStoreWriteBack: TestStoreWriteBack
  lateinit var testWriteBackProvider: WriteBackProvider

  @Before
  fun setUp() {
    BuildFlags.WRITE_ONLY_STORAGE_STACK = true
    testWriteBackProvider = object : WriteBackProvider {
      override fun invoke(protocol: Protocol): WriteBack {
        this@WriteOnlyDirectStoreTest.testStoreWriteBack =
          TestStoreWriteBack(protocol, TestCoroutineScope(TestCoroutineDispatcher()))
        return this@WriteOnlyDirectStoreTest.testStoreWriteBack
      }
    }
  }

  @Test(expected = CrdtException::class)
  fun throws_ifAppropriateDriverCantBeFound() = runBlockingTest {
    createStore()
  }

  @Test
  fun constructsDirectStores_whenRequired() = runBlockingTest {
    val (_, driverProvider) = setupFakes()

    val store = createStore(driverProvider)

    assertThat(store).isInstanceOf(WriteOnlyDirectStore::class.java)
  }

  @Test
  fun appliesAndPropagatesOperations_fromProxies_toDrivers() = runBlockingTest {
    val (driver, driverProvider) = setupFakes()
    val store = createStore(driverProvider) as WriteOnlyDirectStore<CrdtData, CrdtOperation, Any?>
    val op = CrdtCount.Operation.Increment("me", VersionMap("me" to 1))

    store.onProxyMessage(ProxyMessage.Operations(listOf(op), 1))

    assertThat(driver.ops).containsExactly(op)
  }

  @Test(expected = IllegalArgumentException::class)
  fun modelUpdates_throw() = runBlockingTest {
    val (_, driverProvider) = setupFakes()
    val store = createStore(driverProvider) as WriteOnlyDirectStore<CrdtData, CrdtOperation, Any?>

    store.onProxyMessage(ProxyMessage.ModelUpdate(CrdtCount().data, 1))
  }

  @Test(expected = IllegalArgumentException::class)
  fun syncRequests_throw() = runBlockingTest {
    val (_, driverProvider) = setupFakes()
    val store = createStore(driverProvider) as WriteOnlyDirectStore<CrdtData, CrdtOperation, Any?>

    store.onProxyMessage(ProxyMessage.SyncRequest(1))
  }

  @Test
  fun close_setClosed_andCloseDriver() = runBlockingTest {
    val (driver, driverProvider) = setupFakes()
    val store = createStore(driverProvider) as WriteOnlyDirectStore<CrdtData, CrdtOperation, Any?>
    assertThat(driver.closed).isFalse()
    assertThat(testStoreWriteBack.closed).isFalse()

    store.close()

    assertThat(driver.closed).isTrue()
    assertThat(testStoreWriteBack.closed).isTrue()
  }

  @Test
  fun doesNotCallback() = runBlockingTest {
    val (_, driverProvider) = setupFakes()
    val store = createStore(driverProvider)
    store.on {
      Assert.fail("This callback should not be called.")
    }
    val id = store.on {
      Assert.fail("This callback should not be called.")
    }
    val op = CrdtCount.Operation.Increment("me", VersionMap("me" to 1))

    store.onProxyMessage(ProxyMessage.Operations(listOf(op), id))
  }

  private fun setupFakes(): Pair<FakeDriver<CrdtCount.Data>, FakeDriverProvider> {
    val fakeDriver = FakeDriver<CrdtCount.Data>(testKey)
    val fakeProvider = FakeDriverProvider(testKey to fakeDriver)
    return fakeDriver to fakeProvider
  }

  private suspend fun CoroutineScope.createStore(vararg providers: DriverProvider) =
    ActiveStore<CrdtData, CrdtOperation, Any?>(
      StoreOptions(testKey, CountType(), writeOnly = true),
      this,
      FixedDriverFactory(*providers),
      testWriteBackProvider,
      null,
      JvmTime
    )
}
