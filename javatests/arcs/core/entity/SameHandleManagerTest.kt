package arcs.core.entity

import arcs.core.host.EntityHandleManager
import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.testutil.testStoreManager
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
    val stores = testStoreManager()
    monitorStorageEndpointManager = DirectStorageEndpointManager(stores)
    readHandleManager = EntityHandleManager(
      arcId = "testArc",
      hostId = "testHost",
      time = fakeTime,
      scheduler = schedulerProvider("test"),
      storageEndpointManager = DirectStorageEndpointManager(stores),
      foreignReferenceChecker = foreignReferenceChecker
    )
    writeHandleManager = readHandleManager
  }

  @After
  override fun tearDown() = super.tearDown()
}
