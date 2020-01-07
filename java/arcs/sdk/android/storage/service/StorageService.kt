/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk.android.storage.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.text.format.DateFormat
import android.text.format.DateUtils
import android.util.TimeUtils
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.android.storage.ParcelableStoreOptions
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import java.io.FileDescriptor
import java.io.PrintWriter

/**
 * Implementation of a [Service] which manages [Store]s and exposes the ability to access them via
 * the [IStorageService] interface when bound-to by a client.
 */
class StorageService : Service() {
    private val coroutineContext = Dispatchers.IO + CoroutineName("StorageService")
    private val scope = CoroutineScope(coroutineContext)
    private val stores = ConcurrentHashMap<StoreOptions<*, *, *>, Store<*, *, *>>()
    private var startTime: Long? = null

    override fun onCreate() {
        super.onCreate()
        startTime = startTime ?: System.currentTimeMillis()
    }

    override fun onBind(intent: Intent): IBinder? {
        val parcelableOptions = requireNotNull(
            intent.getParcelableExtra<ParcelableStoreOptions?>(EXTRA_OPTIONS)
        ) { "No StoreOptions found in Intent" }

        return BindingContext(
            stores.computeIfAbsent(parcelableOptions.actual) { Store(it) },
            parcelableOptions.crdtType,
            coroutineContext
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    override fun dump(fd: FileDescriptor, writer: PrintWriter, args: Array<out String>) {
        super.dump(fd, writer, args)

        val elapsedTime = System.currentTimeMillis() - (startTime ?: System.currentTimeMillis())
        val storageKeys= stores.keys.map { it.storageKey }.toSet()

        writer.println(
            """
                Arcs StorageService:
                --------------------
                
                Uptime: ${DateUtils.formatElapsedTime(elapsedTime)}
                Active StorageKeys: 
                ${storageKeys.joinToString(",\n", prefix = "[\n", postfix = "\n]")}
                
            """.trimIndent()
        )
    }

    companion object {
        private const val EXTRA_OPTIONS = "storeOptions"

        /**
         * Creates an [Intent] to use when binding to the [StorageService] from a [ServiceStore].
         */
        fun createBindIntent(context: Context, storeOptions: ParcelableStoreOptions): Intent =
            Intent(context, StorageService::class.java).apply {
                putExtra(EXTRA_OPTIONS, storeOptions)
            }
    }
}
