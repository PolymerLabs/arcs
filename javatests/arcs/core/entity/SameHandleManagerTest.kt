package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.testutil.testStorageEndpointManager
import org.junit.After
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
      scheduler = schedulerProvider("test"),
      storageEndpointManager = testStorageEndpointManager(),
      foreignReferenceChecker = foreignReferenceChecker
    )
    writeHandleManager = readHandleManager
  }

  @After
  override fun tearDown() = super.tearDown()
}
