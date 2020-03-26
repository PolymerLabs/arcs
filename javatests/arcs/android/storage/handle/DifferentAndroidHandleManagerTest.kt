package arcs.android.storage.handle

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.storage.StoreManager
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import org.junit.Before
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class DifferentAndroidHandleManagerTest : AndroidHandleManagerTestBase() {
    @Before
    fun setUpHandleManagers() {
        super.setUp()
        val connectionFactory = TestConnectionFactory(app)
        val stores = StoreManager()
        readHandleManager = AndroidHandleManager(
            context = app,
            lifecycle = lifecycle,
            connectionFactory = connectionFactory,
            storeManager = stores
        )
        writeHandleManager = AndroidHandleManager(
            context = app,
            lifecycle = lifecycle,
            connectionFactory = connectionFactory,
            storeManager = stores
        )
    }

}
