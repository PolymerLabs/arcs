package arcs.sdk.android.storage.service.testutil

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerFactory
import androidx.work.WorkerParameters
import arcs.sdk.android.storage.service.DatabaseGarbageCollectionPeriodicTaskV2
import arcs.sdk.android.storage.service.StorageService
import kotlin.reflect.KClass

/**
 * A [WorkerFactory] that injects a [TestBindHelper] in garbage collection tasks.
 */
class TestWorkerFactory(
  private val storageServiceClass: KClass<out StorageService> = StorageService::class
) : WorkerFactory() {
  override fun createWorker(
    appContext: Context,
    workerClassName: String,
    workerParameters: WorkerParameters
  ): Worker? {
    if (workerClassName == DatabaseGarbageCollectionPeriodicTaskV2::class.java.name) {
      return DatabaseGarbageCollectionPeriodicTaskV2(
        appContext,
        workerParameters,
        TestBindHelper(appContext, storageServiceClass),
        storageServiceClass
      )
    }
    return null
  }
}
