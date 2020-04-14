package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreManager
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import kotlinx.coroutines.asCoroutineDispatcher
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.util.concurrent.Executors

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class SameHandleManagerTest : HandleManagerTestBase() {

    @get:Rule var logRule = LogRule()

    @Before
    override fun setUp() {
        super.setUp()
        readHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = fakeTime,
            scheduler = Scheduler(
                fakeTime,
                Executors.newSingleThreadExecutor().asCoroutineDispatcher()
            ),
            stores = StoreManager()
        )
        writeHandleManager = readHandleManager
    }

    @After
    override fun tearDown() = super.tearDown()
}
