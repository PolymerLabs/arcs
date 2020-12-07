package arcs.android.systemhealth.testapp

import arcs.sdk.android.storage.service.StorageService
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import arcs.android.systemhealth.testapp.Dispatchers as ArcsDispatchers
import arcs.android.systemhealth.testapp.Executors as ArcsExecutors

/**
 * Arcs system-health-test storage service designed for performance tests.
 */
class PerformanceStorageService : StorageService() {
  override val coroutineContext =
    ArcsDispatchers.server + CoroutineName("PerformanceStorageService")
  override val writeBackScope: CoroutineScope = CoroutineScope(
    ArcsExecutors.io.asCoroutineDispatcher() + SupervisorJob()
  )
}
