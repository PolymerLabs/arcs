package arcs.sdk.android.storage

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
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
import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import arcs.sdk.android.storage.service.StorageService
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
import org.robolectric.ParameterizedRobolectricTestRunner

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(ParameterizedRobolectricTestRunner::class)
class AndroidStorageServiceEndpointManagerTest(private val parameters: ParameterizedBuildFlags) {

  @get:Rule
  val logRule = LogRule()

  @get:Rule
  val rule = BuildFlagsRule.parameterized(parameters)

  private lateinit var app: Application

  private val emptyCallback: ProxyCallback<CrdtData, CrdtOperation, Any> = {}

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

  @Test
  fun get_closingResult_unbindsService() = runBlockingTest {
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
  fun get_cancellingScope_unbindsService() = runBlockingTest {
    val testBindHelper = TestBindHelper(app)

    // Create a *new* coroutineScope that we will cancel.
    // Give it a different job so cancellation doesn't cause our test to abort.
    val scope = CoroutineScope(coroutineContext + Job())

    val endpointManager = AndroidStorageServiceEndpointManager(
      scope,
      testBindHelper
    )

    withTimeout(15000) {
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

  @Test
  fun get_withCustomServiceClass_bindsToProvidedClass() = runBlockingTest {
    val testBindHelper = TestBindHelper(
      app,
      AnotherServiceClass::class,
      enforceBindIntentMatches = true
    )

    val endpointManager = AndroidStorageServiceEndpointManager(
      this,
      testBindHelper,
      AnotherServiceClass::class.java
    )

    val endpoint = endpointManager.get(
      StoreOptions(
        storageKey,
        type
      ),
      emptyCallback
    )
    endpoint.close()

    // No assertions: the test verifies that these operations completed w/o error.
    // TestBindHelper will throw an error if the AndroidStorageServiceEndpointManager attempts to
    // bind with an Intent using a component name not based on the class it was constructed with.
  }

  // Used for testing correct binding behavior for non-default classes
  class AnotherServiceClass : StorageService()

  companion object {
    @JvmStatic
    @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
    fun params() = ParameterizedBuildFlags.of("STORAGE_SERVICE_NG").toList()
  }
}
