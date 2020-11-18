package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.util.Scheduler
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class SameHandleManagerTest : HandleManagerTestBase() {
  @Before
  override fun setUp() {
    super.setUp()
    monitorStorageEndpointManager = testStorageEndpointManager()
    readHandleManager = EntityHandleManager(
      arcId = "testArc",
      hostId = "testHost",
      time = fakeTime,
      scheduler = Scheduler(scope),
      storageEndpointManager = testStorageEndpointManager(),
      foreignReferenceChecker = foreignReferenceChecker
    )
    writeHandleManager = readHandleManager
  }
}
