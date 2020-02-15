package arcs.sdk.android.storage.service.testutil

import android.content.Context
import android.content.ServiceConnection
import arcs.android.storage.ParcelableStoreOptions
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.StorageServiceBindingDelegate
import org.robolectric.Robolectric
import org.robolectric.android.controller.ServiceController

/**
 * This TestBindingDelegate can be used in tests with [DefaultConnectionFactory] in order to
 * successfully bind with [StorageService] when using Robolectric.
 */
class TestBindingDelegate(private val context: Context) : StorageServiceBindingDelegate {
    var sc: ServiceController<StorageService>? = null
    override fun bindStorageService(
        conn: ServiceConnection,
        flags: Int,
        options: ParcelableStoreOptions
    ): Boolean {
        val intent = StorageService.createBindIntent(
            context,
            options
        )
        sc = Robolectric.buildService(StorageService::class.java, intent)
            .create()
            .bind()
            .also {
                val binder = it.get().onBind(intent)
                conn.onServiceConnected(null, binder)
            }
        return true
    }

    override fun unbindStorageService(conn: ServiceConnection) {
        sc?.destroy()
    }
}
