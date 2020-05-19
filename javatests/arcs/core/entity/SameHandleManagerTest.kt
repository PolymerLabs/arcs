package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreManager
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.testutil.WriteBackForTesting
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
class SameHandleManagerTest : HandleManagerTestBase() {
    @Before
    override fun setUp() {
        super.setUp()
        StoreWriteBack.writeBackFactoryOverride = WriteBackForTesting
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        readHandleManager = EntityHandleManager(
            arcId = "testArc",
            hostId = "testHost",
            time = fakeTime,
            scheduler = schedulerProvider("test"),
            stores = StoreManager()
        )
        writeHandleManager = readHandleManager
    }

    @After
    override fun tearDown() = super.tearDown()

    @Ignore("b/156865977 - Deflake")
    @Test
    override fun collection_noTTL() {
        super.collection_noTTL()
    }

    @Ignore("b/157052996 - Deflake")
    @Test
    override fun singleton_referenceLiveness() {
        super.singleton_referenceLiveness()
    }
}
