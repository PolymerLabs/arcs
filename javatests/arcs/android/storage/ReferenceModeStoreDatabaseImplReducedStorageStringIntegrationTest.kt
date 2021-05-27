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

package arcs.android.storage

import androidx.test.core.app.ApplicationProvider
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtSet
import arcs.core.data.SchemaRegistry
import arcs.core.storage.Driver
import arcs.core.storage.DriverFactory
import arcs.core.storage.FixedDriverFactory
import arcs.core.storage.RawReference
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.driver.DatabaseDriver
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.ReferenceModeStoreTestBase
import arcs.core.util.RandomBuilder
import kotlin.random.Random
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Implementation of [ReferenceModeStoreTestBase] that mirrors
 * [ReferenceModeStoreDatabaseImplIntegrationTest] but uses a stubbed version of [Random] to test
 * edge cases.
 */
@Suppress("UNCHECKED_CAST")
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
class ReferenceModeStoreDatabaseImplReducedStorageStringIntegrationTest :
  ReferenceModeStoreTestBase() {

  override val TEST_KEY = ReferenceModeStorageKey(
    DatabaseStorageKey.Persistent("entities", HASH),
    DatabaseStorageKey.Persistent("set", HASH)
  )

  override lateinit var driverFactory: DriverFactory
  private lateinit var databaseFactory: AndroidSqliteDatabaseManager
  private lateinit var oldRandomBuilder: (Long?) -> Random

  @Before
  override fun setUp() = runBlockingTest {
    super.setUp()
    StorageKeyManager.GLOBAL_INSTANCE.reset(DatabaseStorageKey.Persistent)
    databaseFactory = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
    DatabaseDriverProvider.configure(databaseFactory, SchemaRegistry::getSchema)
    driverFactory = FixedDriverFactory(DatabaseDriverProvider)

    val knownRandom = { MyRandom() }

    // Set the global random builder.
    oldRandomBuilder = RandomBuilder
    RandomBuilder = { knownRandom() }
  }

  @After
  fun tearDown() = runBlockingTest {
    databaseFactory.resetAll()
    RandomBuilder = oldRandomBuilder
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

  // Class that wraps around Random with a seed of 0. This class will return a specific array
  // the first time nextBytes(8) is called which allows us to test edge cases.
  class MyRandom() : Random() {
    private val r = Random(0)
    private var nextBytesCalled = false
    override fun nextBits(bitCount: Int): Int {
      return r.nextBits(bitCount)
    }

    override fun nextBytes(size: Int): ByteArray {
      if (!nextBytesCalled && size == 8) {
        nextBytesCalled = true
        return byteArrayOf(-128, 0, 3, 4, 5, 6, 7, 127)
      }
      return r.nextBytes(size)
    }
  }
}
