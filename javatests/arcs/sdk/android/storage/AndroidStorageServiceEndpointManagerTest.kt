package arcs.sdk.android.storage

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.data.EntityType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.storage.ProxyCallback
import arcs.core.storage.StoreOptions
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.testutil.LogRule
import arcs.sdk.android.storage.service.testutil.TestBindHelper
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.runBlockingTest
import kotlinx.coroutines.withTimeout
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class AndroidStorageServiceEndpointManagerTest {

  @get:Rule
  val logRule = LogRule()

  private lateinit var app: Application

  private val emptyCallback: ProxyCallback<CrdtData, CrdtOperationAtTime, Any> = {}

  private val storageKey = ReferenceModeStorageKey(
    RamDiskStorageKey("backing"),
    RamDiskStorageKey("entity")
  )

  val type = SingletonType(
    EntityType(
      Schema(
        setOf(SchemaName("TestType")),
        fields = SchemaFields(
          emptyMap(), emptyMap()
        ),
        hash = "abcdef"
      )
    )
  )

  @Before
  fun setup() {
    DriverAndKeyConfigurator.configure(null)
    app = ApplicationProvider.getApplicationContext<Application>()
    // Initialize WorkManager for instrumentation tests.
    WorkManagerTestInitHelper.initializeTestWorkManager(app)
  }

  private fun runTest(block: suspend CoroutineScope.() -> Unit): Unit = runBlockingTest {
    block()
  }

  @Test
  fun createAndCloseEndpoint() = runTest {
    val testBindHelper = TestBindHelper(app)

    val endpointManager = AndroidStorageServiceEndpointManager(
      this,
      testBindHelper
    )

    val endpoint = withTimeout(15000) {
      endpointManager.get(
        StoreOptions(
          storageKey,
          type
        ),
        emptyCallback
      )
    }

    withTimeout(15000) {
      endpoint.close()
    }

    assertThat(testBindHelper.activeBindings()).isEqualTo(0)
  }

  @Test
  fun scopeClosesEndpoints() = runTest {
    val testBindHelper = TestBindHelper(app)

    // Create a *new* coroutineScope that we will cancel.
    // Give it a ddfferent job so cancellation doesn't cause our test to abort.
    val scope = CoroutineScope(coroutineContext + Job())

    val endpointManager = AndroidStorageServiceEndpointManager(
      scope,
      testBindHelper
    )

    val endpoint = withTimeout(15000) {
      endpointManager.get(
        StoreOptions(
          storageKey,
          type
        ),
        emptyCallback
      )
    }

    scope.cancel()

    // Exiting the scope above should result in disconnected endpoints, even without explicitly
    // doing anything.
    assertThat(testBindHelper.activeBindings()).isEqualTo(0)
  }
}
