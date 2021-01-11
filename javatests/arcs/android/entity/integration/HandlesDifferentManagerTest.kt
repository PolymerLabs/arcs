package arcs.android.entity.integration

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.entity.integration.HandlesTestBase
import arcs.core.host.HandleManagerImpl
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.driver.DatabaseDriverProvider
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
class HandlesDifferentManagerTest : HandlesTestBase() {

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
      bindHelper = TestBindHelper(app)
    )
    monitorStorageEndpointManager = storageEndpointManager
    readHandleManagerImpl = HandleManagerImpl(
      arcId = "arcId",
      hostId = "hostId",
      time = fakeTime,
      scheduler = schedulerProvider("reader"),
      storageEndpointManager = storageEndpointManager,
      foreignReferenceChecker = foreignReferenceChecker
    )
    writeHandleManagerImpl = HandleManagerImpl(
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
