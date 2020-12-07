package arcs.android.systemhealth.testapp

import android.content.Context
import android.content.Intent
import arcs.sdk.android.storage.service.StorageService
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.random.Random
import arcs.android.systemhealth.testapp.Dispatchers as ArcsDispatchers
import arcs.android.systemhealth.testapp.Executors as ArcsExecutors

/**
 * Arcs system-health-test storage service. Supports crashing itself when needed.
 */
class StabilityStorageService : StorageService() {
  override val coroutineContext =
    ArcsDispatchers.server + CoroutineName("StabilityStorageService")
  override val writeBackScope: CoroutineScope = CoroutineScope(
    ArcsExecutors.io.asCoroutineDispatcher() + SupervisorJob()
  )
  private val scope = CoroutineScope(coroutineContext)

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent != null &&
      intent.hasExtra(EXTRA_CRASH) &&
      intent.getBooleanExtra(EXTRA_CRASH, false)
    ) {
      scope.launch {
        delay(Random.nextLong(10, 1000))
        android.os.Process.killProcess(android.os.Process.myPid())
      }
    }
    return super.onStartCommand(intent, flags, startId)
  }

  override fun onDestroy() {
    scope.cancel()
    super.onDestroy()
  }

  companion object {
    const val EXTRA_CRASH = "crash"

    fun createCrashIntent(context: Context): Intent =
      Intent(context, StabilityStorageService::class.java).apply {
        putExtra(EXTRA_CRASH, true)
      }
  }
}
