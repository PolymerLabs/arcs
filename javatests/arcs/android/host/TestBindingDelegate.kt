package arcs.android.host

import android.content.Context
import android.content.ServiceConnection
import arcs.android.storage.ParcelableStoreOptions
import arcs.core.host.EntityHandleManager
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.StorageServiceBindingDelegate
import org.robolectric.Robolectric
import org.robolectric.android.controller.ServiceController

class TestBindingDelegate(
    val context: Context
) : StorageServiceBindingDelegate {
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
        if (sc == null) {
            sc = Robolectric.buildService(StorageService::class.java, intent).create().bind().also {
                val binder = it.get().onBind(intent)
                conn.onServiceConnected(null, binder)
            }
        } else {
            val binder = sc!!.get().onBind(intent)
            conn.onServiceConnected(null, binder)
        }
        return true
    }

    override fun unbindStorageService(conn: ServiceConnection) {
        sc?.destroy()
    }
}

