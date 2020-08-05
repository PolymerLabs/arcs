package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.StoreManager
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.testutil.WriteBackForTesting
import arcs.jvm.host.JvmSchedulerProvider
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DifferentHandleManagerDifferentStoresTest : HandleManagerTestBase() {
    private var i = 0

    private lateinit var readStores: StoreManager
    private lateinit var writeStores: StoreManager

    @Before
    override fun setUp() {
        super.setUp()
        i++
        StoreWriteBack.writeBackFactoryOverride = WriteBackForTesting
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        readStores = StoreManager()
        readHandleManager = EntityHandleManager(
            arcId = "testArcId",
            hostId = "testHostId",
            time = fakeTime,
            scheduler = schedulerProvider("reader-#$i"),
            stores = readStores
        )
        writeStores = StoreManager()
        writeHandleManager = EntityHandleManager(
            arcId = "testArcId",
            hostId = "testHostId",
            time = fakeTime,
            scheduler = schedulerProvider("writer"),
            stores = writeStores
        )
    }

    @After
    override fun tearDown() {
        super.tearDown()
        runBlocking {
            readStores.reset()
            writeStores.reset()
        }
    }
}
