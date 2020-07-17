package arcs.android.systemhealth.testapp

import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import arcs.android.storage.ParcelableStoreOptions
import arcs.android.systemhealth.testapp.Dispatchers as ArcsDispatchers
import arcs.android.systemhealth.testapp.Executors as ArcsExecutors
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.StorageServiceBindingDelegate
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher

/**
 * Arcs system-health-test storage service designed for performance tests.
 */
class PerformanceStorageService : StorageService() {
    override val coroutineContext =
        ArcsDispatchers.server + CoroutineName("PerformanceStorageService")
    override val writeBackScope: CoroutineScope = CoroutineScope(
        ArcsExecutors.io.asCoroutineDispatcher() + SupervisorJob()
    )

    companion object {
        fun createBindIntent(context: Context, storeOptions: ParcelableStoreOptions): Intent =
            Intent(context, PerformanceStorageService::class.java).apply {
                action = storeOptions.actual.storageKey.toString()
                putExtra(EXTRA_OPTIONS, storeOptions)
            }
    }
}

/** Implementation of the [StorageServiceBindingDelegate] which uses [PerformanceStorageService]. */
class PerformanceStorageServiceBindingDelegate(
    private val context: Context
) : StorageServiceBindingDelegate {
    @Suppress("NAME_SHADOWING")
    override fun bindStorageService(
        conn: ServiceConnection,
        flags: Int,
        options: ParcelableStoreOptions?
    ): Boolean {
        val options = requireNotNull(options) {
            "ParcelableStoreOptions are required when binding to " +
                "the PerformanceStorageService from a ServiceStore."
        }
        return context.bindService(
            PerformanceStorageService.createBindIntent(context, options), conn, flags)
    }

    override fun unbindStorageService(conn: ServiceConnection) =
        context.unbindService(conn)
}
