package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreManager
import arcs.core.util.Scheduler
import arcs.jvm.util.testutil.FakeTime
import kotlinx.coroutines.asCoroutineDispatcher
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.util.concurrent.Executors

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DifferentHandleManagerTest : HandleManagerTestBase() {

    @Before
    override fun setUp() {
        super.setUp()
        val stores = StoreManager()
        readHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = FakeTime(),
            scheduler = Scheduler(
                FakeTime(),
                Executors.newSingleThreadExecutor().asCoroutineDispatcher()
            ),
            stores = stores
        )
        writeHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = FakeTime(),
            scheduler = Scheduler(
                FakeTime(),
                Executors.newSingleThreadExecutor().asCoroutineDispatcher()
            ),
            stores = stores
        )
    }

    @After
    override fun tearDown() = super.tearDown()
}
