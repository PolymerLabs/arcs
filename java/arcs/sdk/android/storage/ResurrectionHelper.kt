package arcs.sdk.android.storage

import android.content.Context
import android.content.Intent
import arcs.android.common.resurrection.ResurrectionRequest
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.sdk.android.storage.service.StorageService

/**
 * Tool which can be used by Arc Hosts to register with the [StorageService] for resurrection.
 *
 * ## Important note:
 *
 * The [Context] used to register for resurrection and the [ResurrectionRequest] received by the
 * storage service have a one-to-one relationship. This means that there should be only one
 * [ResurrectionHelper] used per service.
 *
 * ## Example Usage:
 *
 * ```kotlin
 * class MyService : Service() {
 *     private val myHelper: ResurrectionHelper by lazy {
 *         ResurrectionHelper(this, ::onResurrected)
 *     }
 *
 *     override fun onStartCommand(intent: Intent?, flags: Int, startId: Int) {
 *         val result = super.onStartCommand(intent, flags, startId)
 *         myHelper.onStartCommand(intent)
 *         return result
 *     }
 *
 *     private fun something() {
 *         // ...
 *         myHelper.requestResurrection(listOf(RamDiskStorageKey("foo")))
 *         // ...
 *     }
 *
 *     private fun onResurrected(keys: List<StorageKey>) {
 *         // ...
 *     }
 * }
 * ```
 */
class ResurrectionHelper(
    private val context: Context,
    private val onResurrected: (List<StorageKey>) -> Unit
) {
    /**
     * Determines whether or not the given [intent] represents a resurrection, and if it does:
     * calls [onResurrected].
     */
    fun onStartCommand(intent: Intent?) {
        if (intent?.action?.startsWith(ResurrectionRequest.ACTION_RESURRECT) != true) return

        val notifiers = intent.getStringArrayListExtra(
            ResurrectionRequest.EXTRA_RESURRECT_NOTIFIER
        ) ?: return

        onResurrected(notifiers.map(StorageKeyParser::parse))
    }

    /**
     * Issue a request to be resurrected by the [StorageService] whenever the data identified by
     * the provided [keys] changes.
     */
    fun requestResurrection(keys: List<StorageKey>) {
        val intent = Intent(context, StorageService::class.java)
        val request = ResurrectionRequest.createDefault(context, keys)
        request.populateRequestIntent(intent)
        context.startService(intent)
    }
}