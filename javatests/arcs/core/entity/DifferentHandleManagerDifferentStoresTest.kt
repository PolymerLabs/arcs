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
class DifferentHandleManagerDifferentStoresTest : HandleManagerTestBase() {
    private var i = 0

    @Before
    override fun setUp() {
        super.setUp()
        i++
        StoreWriteBack.writeBackFactoryOverride = WriteBackForTesting
        schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)
        readHandleManager = EntityHandleManager(
            arcId = "testArcId",
            hostId = "testHostId",
            time = fakeTime,
            scheduler = schedulerProvider("reader-#$i"),
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

    @Test
    override fun collection_removingFromA_isRemovedFromB() {
        super.collection_removingFromA_isRemovedFromB()
    }

    @Test
    override fun singleton_referenceLiveness() {
        super.singleton_referenceLiveness()
    }

    @Test
    override fun collection_referenceLiveness() {
        super.collection_referenceLiveness()
    }

    @Test
    override fun singleton_dereferenceEntity() {
        super.singleton_dereferenceEntity()
    }

    @Test
    override fun collection_entityDereference() {
        super.collection_entityDereference()
    }

    @Test
    override fun singleton_clearOnAClearDataWrittenByB() {
        super.singleton_clearOnAClearDataWrittenByB()
    }
}
