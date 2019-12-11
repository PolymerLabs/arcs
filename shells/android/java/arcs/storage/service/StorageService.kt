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

package arcs.storage.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.storage.parcelables.ParcelableStoreOptions
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel

/**
 * Implementation of a [Service] which manages [Store]s and exposes the ability to access them via
 * the [IStorageService] interface when bound-to by a client.
 */
class StorageService : Service() {
    private val coroutineContext = Dispatchers.IO + CoroutineName("StorageService")
    private val scope = CoroutineScope(coroutineContext)
    private val stores = ConcurrentHashMap<StoreOptions<*, *, *>, Store<*, *, *>>()

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
