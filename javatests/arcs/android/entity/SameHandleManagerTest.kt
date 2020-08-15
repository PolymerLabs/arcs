package arcs.android.entity

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.entity.HandleManagerTestBase
import arcs.core.host.EntityHandleManager
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.jvm.host.JvmSchedulerProvider
import arcs.sdk.android.storage.AndroidStorageEndpointManager
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.Dispatchers
import org.junit.Before
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class SameHandleManagerTest : HandleManagerTestBase() {
    lateinit var app: Application

    @Before
    override fun setUp() {
        super.setUp()
        testTimeout = 30000
        app = ApplicationProvider.getApplicationContext()
        val dbFactory = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
        DatabaseDriverProvider.configure(dbFactory) { throw UnsupportedOperationException() }
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        storageEndpointManager = AndroidStorageEndpointManager(
            app,
            Dispatchers.Default,
            connectionFactory = TestConnectionFactory(app)
        )
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("test"),
            storageEndpointManager = storageEndpointManager
        )
        writeHandleManager = readHandleManager

        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }
}
