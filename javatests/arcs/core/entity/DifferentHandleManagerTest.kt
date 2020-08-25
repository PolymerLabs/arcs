package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreManager
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.testutil.WriteBackForTesting
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DifferentHandleManagerTest : HandleManagerTestBase() {
    private var i = 0

    @Before
    override fun setUp() {
        super.setUp()
        val stores = StoreManager()
        i++
        StoreWriteBack.writeBackFactoryOverride = WriteBackForTesting
        readHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = fakeTime,
            scheduler = schedulerProvider("reader-#$i"),
            stores = stores
        )
        writeHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = fakeTime,
            scheduler = schedulerProvider("writer-#$i"),
            stores = stores
        )
    }

    @After
    override fun tearDown() = super.tearDown()
}
