package arcs.android.storage.handle

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import org.junit.Before
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class SameAndroidHandleManagerTest : AndroidHandleManagerTestBase() {
    @Before
    fun setUpHandleManagers() {
        super.setUp()
        val connectionFactory = TestConnectionFactory(app)
        readHandleManager = AndroidHandleManager(
            context = app,
            lifecycle = lifecycle,
            connectionFactory = connectionFactory
        )
        writeHandleManager = readHandleManager
    }

}
