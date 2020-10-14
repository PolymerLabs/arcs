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
class DifferentHandleManagerTest : HandleManagerTestBase() {

  lateinit var app: Application

  lateinit var storageEndpointManager: StorageEndpointManager

  private val scope = CoroutineScope(Dispatchers.Default)

  @Before
  override fun setUp() {
    super.setUp()
    app = ApplicationProvider.getApplicationContext()
    // Initialize WorkManager for instrumentation tests.
    WorkManagerTestInitHelper.initializeTestWorkManager(app)
    testTimeout = 60000
    val dbFactory = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
    DatabaseDriverProvider.configure(dbFactory) { throw UnsupportedOperationException() }
    storageEndpointManager = AndroidStorageServiceEndpointManager(
      scope,
      connectionFactory = TestConnectionFactory(app)
    )
    monitorStorageEndpointManager = storageEndpointManager
    readHandleManager = EntityHandleManager(
      arcId = "arcId",
      hostId = "hostId",
      time = fakeTime,
      scheduler = schedulerProvider("reader"),
      storageEndpointManager = storageEndpointManager,
      foreignReferenceChecker = foreignReferenceChecker
    )
    writeHandleManager = EntityHandleManager(
      arcId = "arcId",
      hostId = "hostId",
      time = fakeTime,
      scheduler = schedulerProvider("writer"),
      storageEndpointManager = storageEndpointManager,
      foreignReferenceChecker = foreignReferenceChecker
    )
  }

  @After
  override fun tearDown() {
    super.tearDown()
    scope.cancel()
  }
}
