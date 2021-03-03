/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.SchemaRegistry
import arcs.core.storage.driver.DatabaseDriver
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.RefModeStoreHelper
import arcs.core.storage.testutil.ReferenceModeStoreTestBase
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("UNCHECKED_CAST")
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class ReferenceModeStoreDatabaseIntegrationTest : ReferenceModeStoreTestBase() {

  override val TEST_KEY = ReferenceModeStorageKey(
    DatabaseStorageKey.Persistent("entities", HASH),
    DatabaseStorageKey.Persistent("set", HASH)
  )
  override lateinit var driverFactory: DriverFactory
  private lateinit var databaseFactory: FakeDatabaseManager

  @Before
  override fun setUp() = runBlockingTest {
    super.setUp()
    StorageKeyManager.GLOBAL_INSTANCE.reset(DatabaseStorageKey.Persistent)
    databaseFactory = FakeDatabaseManager()
    DatabaseDriverProvider.configure(databaseFactory, SchemaRegistry::getSchema)
    driverFactory = FixedDriverFactory(DatabaseDriverProvider)
  }

  @Test
  fun databaseRoundtrip() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    val storeHelper = RefModeStoreHelper("me", activeStore)

    val e1 = createPersonEntity("e1", "e1", 1, listOf(1L), "inline1")
    val e2 = createPersonEntity("e2", "e2", 2, listOf(2L), "inline2")
    storeHelper.sendAddOp(e1)
    storeHelper.sendAddOp(e2)

    // Read data (using a new store ensures we read from the db instead of using cached values).
    val activeStore2 = collectionReferenceModeStore(scope = this)
    val e1Ref = CrdtSet.DataValue(
      VersionMap("me" to 1),
      RawReference("e1", activeStore2.backingStore.storageKey, VersionMap("me" to 1))
    )
    val e2Ref = CrdtSet.DataValue(
      VersionMap("me" to 2),
      RawReference("e2", activeStore2.backingStore.storageKey, VersionMap("me" to 2))
    )

    assertThat(activeStore2.containerStore.getLocalData()).isEqualTo(
      CrdtSet.DataImpl(
        VersionMap("me" to 2),
        mutableMapOf(
          "e1" to e1Ref,
          "e2" to e2Ref
        )
      )
    )
    assertThat(
      activeStore2.getLocalData("e1").toRawEntity()
    ).isEqualTo(e1)
    assertThat(
      activeStore2.getLocalData("e2").toRawEntity()
    ).isEqualTo(e2)
  }

  @Test
  fun syncShouldNotIncurWrites_fromProxy_withModel() = runBlockingTest {
    val activeStore = collectionReferenceModeStore(scope = this)
    // Use a larger callback token so that the events we send aren't filtered from the listener we
    // attach below.
    val storeHelper = RefModeStoreHelper("me", activeStore, callbackToken = 111)

    val (_, entityCollectionHelper) = createCrdtSet<RawEntity>("me")
    val bob = createPersonEntity("an-id", "bob", 42, listOf(1L, 1L, 2L), "inline")
    entityCollectionHelper.add(bob)

    var job = Job(coroutineContext[Job])
    var id: Int = -1
    id = activeStore.on {
      when (it) {
        is ProxyMessage.Operations ->
          activeStore.onProxyMessage(ProxyMessage.SyncRequest(id))
        is ProxyMessage.ModelUpdate ->
          job.complete()
        else -> Unit
      }
    }

    storeHelper.sendAddOp(bob)

    job.join()

    /**
     * Mainly exercise [ReferenceModeStore.constructPendingIdsAndModel] code path at the
     * duplicate [ReferenceModeStore] that handles the same [StorageKey]. The store should
     * gets its [DirectStore.onReceive] called to apply the model received from the underlying
     * driver. The assertion validates the [DirectStore.onReceive] responding to the
     * [ProxyMessage.SyncRequest] should never incur additional writes/updates sent to the
     * driver.
     */
    val activeStoreDup = collectionReferenceModeStore(scope = this)
    job = Job(coroutineContext[Job])
    val counts = databaseFactory.totalInsertUpdates()
    activeStoreDup.on {
      assertThat(databaseFactory.totalInsertUpdates()).isEqualTo(counts)
      job.complete()
    }.let {
      activeStoreDup.onProxyMessage(ProxyMessage.SyncRequest(it))
    }
    job.join()
  }

  override suspend fun sendToReceiver(
    driver: Driver<CrdtData>,
    data: CrdtSet.Data<RawReference>,
    version: Int
  ) {
    val databaseDriver = driver as DatabaseDriver<CrdtSet.Data<RawReference>>
    val receiver = requireNotNull(databaseDriver.receiver) { "Driver receiver is missing." }
    receiver(data, version)
  }
}
