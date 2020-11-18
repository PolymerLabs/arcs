package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.util.Scheduler
import org.junit.Before
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
    val readStores = testStorageEndpointManager()
    monitorStorageEndpointManager = readStores
    readHandleManager = EntityHandleManager(
      arcId = "testArcId",
      hostId = "testHostId",
      time = fakeTime,
      scheduler = Scheduler(scope, name = "reader-#$i"),
      storageEndpointManager = readStores,
      foreignReferenceChecker = foreignReferenceChecker
    )
    val writeStores = testStorageEndpointManager()
    writeHandleManager = EntityHandleManager(
      arcId = "testArcId",
      hostId = "testHostId",
      time = fakeTime,
      scheduler = Scheduler(scope, name = "writer-#$i"),
      storageEndpointManager = writeStores,
      foreignReferenceChecker = foreignReferenceChecker
    )
  }
}
