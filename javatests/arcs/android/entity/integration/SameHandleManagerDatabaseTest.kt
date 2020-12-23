package arcs.android.entity.integration

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.entity.integration.HandleManagerTestBase
import arcs.core.host.HandleManagerImpl
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.util.Scheduler
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.testutil.TestBindHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class SameHandleManagerDatabaseTest : HandleManagerTestBase() {

  lateinit var app: Application
  private lateinit var scheduler: Scheduler
  private lateinit var storageEndpointManager: StorageEndpointManager
  private val scope = CoroutineScope(Dispatchers.Default)

  protected override fun createStorageKey(unique: String, hash: String): StorageKey {
    return DatabaseStorageKey.Persistent(unique, hash)
  }

  @Before
  override fun setUp() {
    super.setUp()
    testTimeout = 30000
    app = ApplicationProvider.getApplicationContext()
    // Initialize WorkManager for instrumentation tests.
    WorkManagerTestInitHelper.initializeTestWorkManager(app)

    storageEndpointManager = AndroidStorageServiceEndpointManager(scope, TestBindHelper(app))
    monitorStorageEndpointManager = storageEndpointManager
    DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(app))
    scheduler = schedulerProvider("test")

    readHandleManagerImpl = HandleManagerImpl(
      arcId = "arcId",
      hostId = "hostId",
      time = fakeTime,
      scheduler = scheduler,
      storageEndpointManager = storageEndpointManager,
      foreignReferenceChecker = foreignReferenceChecker
    )
    writeHandleManagerImpl = readHandleManagerImpl
  }

  @After
  override fun tearDown() {
    scheduler.cancel()
    super.tearDown()
  }
}
