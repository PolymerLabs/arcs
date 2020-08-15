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
class DifferentHandleManagerTest : HandleManagerTestBase() {

    lateinit var app: Application

    @Before
    override fun setUp() {
        super.setUp()
        testTimeout = 60000
        val dbFactory = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
        DatabaseDriverProvider.configure(dbFactory) { throw UnsupportedOperationException() }
        app = ApplicationProvider.getApplicationContext()
        storageEndpointManager = AndroidStorageEndpointManager(
            app,
            Dispatchers.Default,
            connectionFactory = TestConnectionFactory(app)
        )
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        readHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("reader"),
            storageEndpointManager = storageEndpointManager
        )
        writeHandleManager = EntityHandleManager(
            arcId = "arcId",
            hostId = "hostId",
            time = fakeTime,
            scheduler = schedulerProvider("writer"),
            storageEndpointManager = storageEndpointManager
        )
        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(app)
    }
}
