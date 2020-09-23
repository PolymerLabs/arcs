package arcs.android.entity

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.entity.HandleManagerTestBase
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class SameHandleManagerTest : HandleManagerTestBase() {
  lateinit var app: Application

  private lateinit var storageEndpointManager: StorageEndpointManager

  private val coroutineScope = CoroutineScope(Dispatchers.Default)

  @Before
  override fun setUp() {
    super.setUp()
    testTimeout = 30000
    app = ApplicationProvider.getApplicationContext()
    val dbFactory = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
    DatabaseDriverProvider.configure(dbFactory) { throw UnsupportedOperationException() }
    // Initialize WorkManager for instrumentation tests.
    WorkManagerTestInitHelper.initializeTestWorkManager(app)

    storageEndpointManager = AndroidStorageServiceEndpointManager(
      coroutineScope,
      connectionFactory = TestConnectionFactory(app)
    )
    monitorStorageEndpointManager = storageEndpointManager

    readHandleManager = EntityHandleManager(
      arcId = "arcId",
      hostId = "hostId",
      time = fakeTime,
      scheduler = schedulerProvider("test"),
      storageEndpointManager = storageEndpointManager,
      foreignReferenceChecker = foreignReferenceChecker
    )
    writeHandleManager = readHandleManager
  }

  @After
  override fun tearDown() {
    super.tearDown()
    coroutineScope.cancel()
  }
}
