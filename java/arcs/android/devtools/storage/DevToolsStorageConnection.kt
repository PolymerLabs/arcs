package arcs.android.devtools.storage

import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import arcs.android.storage.ParcelableStoreOptions
import arcs.sdk.android.storage.service.StorageService
import arcs.sdk.android.storage.service.StorageServiceBindingDelegate
import arcs.sdk.android.storage.service.StorageServiceConnection
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi

typealias DevToolsConnectionFactory = () -> StorageServiceConnection

/**
 * Returns a [DevToolsConnectionFactory] implementation which uses the provided [context] to bind to
 * the [StorageService] and the provided [coroutineContext] as the parent for
 * [StorageServiceConnection.connectAsync]'s [Deferred] return value.
 */
@Suppress("FunctionName")
@ExperimentalCoroutinesApi
fun DevToolsConnectionFactory(
  context: Context,
  storageClass: Class<StorageService>,
  bindingDelegate: StorageServiceBindingDelegate = DevToolsStorageManagerBindingDelegate(
    context,
    storageClass
  ),
  coroutineContext: CoroutineContext = Dispatchers.Default
): DevToolsConnectionFactory = { StorageServiceConnection(bindingDelegate, null, coroutineContext) }

/**
 * Implementation of the [StorageServiceBindingDelegate] that creates a [IDevToolsStorageManager]
 * binding to the [StorageService].
 */
class DevToolsStorageManagerBindingDelegate(
  private val context: Context,
  private val storageClass: Class<StorageService>
) : StorageServiceBindingDelegate {
  override fun bindStorageService(
    conn: ServiceConnection,
    flags: Int,
    options: ParcelableStoreOptions?
  ): Boolean {
    val intent = Intent(context, storageClass).apply {
      action = StorageService.DEVTOOLS_ACTION
    }
    return context.bindService(intent, conn, flags)
  }

  override fun unbindStorageService(conn: ServiceConnection) = context.unbindService(conn)
}
