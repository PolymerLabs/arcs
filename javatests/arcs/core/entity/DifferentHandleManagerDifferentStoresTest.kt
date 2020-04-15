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
class DifferentHandleManagerDifferentStoresTest : HandleManagerTestBase() {

    @Before
    override fun setUp() {
        super.setUp()
        readHandleManager = EntityHandleManager(
            arcId = "testArcId",
            hostId = "testHostId",
            time = fakeTime,
            scheduler = Scheduler(
                fakeTime,
                Executors.newSingleThreadExecutor().asCoroutineDispatcher()
            ),
            stores = StoreManager()
        )
        writeHandleManager = EntityHandleManager(
            arcId = "testArcId",
            hostId = "testHostId",
            time = fakeTime,
            scheduler = Scheduler(
                fakeTime,
                Executors.newSingleThreadExecutor().asCoroutineDispatcher()
            ),
            stores = StoreManager()
        )
    }

    @After
    override fun tearDown() = super.tearDown()

    // We don't expect these to pass, since Operations won't make it through the driver level
    override fun singleton_writeAndOnUpdate() {}
    override fun collection_writeAndOnUpdate() {}
}
