package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreManager
import arcs.jvm.host.JvmSchedulerProvider
import kotlin.coroutines.EmptyCoroutineContext
import org.junit.After
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DifferentHandleManagerDifferentStoresTest : HandleManagerTestBase() {
    @Before
    override fun setUp() {
        super.setUp()
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        readHandleManager = EntityHandleManager(
            arcId = "testArcId",
            hostId = "testHostId",
            time = fakeTime,
            scheduler = schedulerProvider("reader"),
            stores = StoreManager()
        )
        writeHandleManager = EntityHandleManager(
            arcId = "testArcId",
            hostId = "testHostId",
            time = fakeTime,
            scheduler = schedulerProvider("writer"),
            stores = StoreManager()
        )
    }

    @After
    override fun tearDown() = super.tearDown()

    // TODO(b/152436411): Fix these.
    @Test
    @Ignore("b/152436411 - deflake")
    override fun collection_referenceLiveness() {
        super.collection_referenceLiveness()
    }

    // We don't expect these to pass, since Operations won't make it through the driver level
    override fun singleton_writeAndOnUpdate() {}
    override fun collection_writeAndOnUpdate() {}
}
