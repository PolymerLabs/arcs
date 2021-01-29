package arcs.android.entity.integration

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.entity.integration.HandlesTestBase as CoreHandlesTestBase
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.testutil.DummyStorageKey
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.testutil.TestBindHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import org.junit.Before
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.ParameterizedRobolectricTestRunner.Parameters

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(ParameterizedRobolectricTestRunner::class)
class HandlesTest(val param: Params) : CoreHandlesTestBase(param.baseParams) {
  private lateinit var app: Application
  private val scope = CoroutineScope(Dispatchers.Default)

  protected override fun initStorageEndpointManager(): StorageEndpointManager {
    return AndroidStorageServiceEndpointManager(scope, TestBindHelper(app))
  }

  protected override fun createStorageKey(unique: String, hash: String): StorageKey {
    return if (param.isDatabase) {
      DatabaseStorageKey.Persistent(unique, hash)
    } else super.createStorageKey(unique, hash)
  }

  @Before
  override fun setUp() {
    super.setUp()

    testTimeout = 30000
    app = ApplicationProvider.getApplicationContext()

    val dbFactory = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
    DatabaseDriverProvider.configure(dbFactory) { throw UnsupportedOperationException() }

    // Initialize WorkManager for instrumentation tests.
    WorkManagerTestInitHelper.initializeTestWorkManager(app)

    if (param.isDatabase) {
      DriverAndKeyConfigurator.configure(AndroidSqliteDatabaseManager(app))
    }
    // This is needed to register dummy key in parser.
    DummyStorageKey("")

    initHandleManagers()
  }

  companion object {
    @JvmStatic
    @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
    fun testCases() = listOf(
      arrayOf(Params(CoreHandlesTestBase.SAME_MANAGER, isDatabase = false)),
      arrayOf(Params(CoreHandlesTestBase.SAME_MANAGER, isDatabase = true)),
      arrayOf(Params(CoreHandlesTestBase.DIFFERENT_MANAGER, isDatabase = false)),
      arrayOf(Params(CoreHandlesTestBase.DIFFERENT_MANAGER, isDatabase = true)),
      arrayOf(Params(CoreHandlesTestBase.DIFFERENT_MANAGER_DIFFERENT_STORES, isDatabase = false))
      // TODO(b/177936541): This always times out.
      // arrayOf(Params(CoreHandlesTestBase.DIFFERENT_MANAGER_DIFFERENT_STORES, isDatabase = true))
    )
  }

  data class Params(
    val baseParams: CoreHandlesTestBase.Params,
    val isDatabase: Boolean
  ) {
    override fun toString(): String = "$baseParams${if (isDatabase) " - Database" else ""}"
  }
}
