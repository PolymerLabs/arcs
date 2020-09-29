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
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.testutil.LogRule
import arcs.sdk.android.storage.service.testutil.TestStorageServiceFactory
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.test.runBlockingTest
import kotlinx.coroutines.withTimeout
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@ExperimentalCoroutinesApi
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
    app = ApplicationProvider.getApplicationContext<Application>()
    // Initialize WorkManager for instrumentation tests.
    WorkManagerTestInitHelper.initializeTestWorkManager(app)
  }

  private fun runTest(block: suspend CoroutineScope.() -> Unit): Unit = runBlockingTest {
    block()
  }

  @Test
  fun createAndCloseEndpoint() = runTest {
    val testStorageServiceFactory = TestStorageServiceFactory.create(app, coroutineContext)

    val endpointManager = AndroidStorageServiceEndpointManager(
      this,
      testStorageServiceFactory
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

    assertThat(testStorageServiceFactory.bindingDelegate.activeBindings()).isEqualTo(0)
  }

  @Test
  fun scopeClosesEndpoints() = runTest {
    // Create a *new* coroutineScope that we will exit.
    val testStorageServiceFactory = coroutineScope {
      val testStorageServiceFactory = TestStorageServiceFactory.create(app, coroutineContext)

      val endpointManager = AndroidStorageServiceEndpointManager(
        this,
        testStorageServiceFactory
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
      testStorageServiceFactory
    }

    // Exiting the scope above should result in disconnected endpoints, even without explicitly
    // doing anything.
    assertThat(testStorageServiceFactory.bindingDelegate.activeBindings()).isEqualTo(0)
  }
}
