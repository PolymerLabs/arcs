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
import arcs.storage.Store
import arcs.storage.parcelables.ParcelableProxyMessage
import arcs.storage.parcelables.ParcelableStoreOptions

/**
 * Implementation of a [Service] which manages [Store]s and exposes the ability to access them via
 * the [IStorageService] interface when bound-to by a client.
 */
class StorageService : Service() {
    override fun onBind(p0: Intent?): IBinder? = BindingContext()

    class BindingContext : IStorageService.Stub() {
        override fun registerCallback(callback: IStorageServiceCallback): Int {
            TODO("implement me")
        }

        override fun sendProxyMessage(
            message: ParcelableProxyMessage,
            resultCallback: IResultCallback
        ) {
            TODO("implement me")
        }

        override fun unregisterCallback(token: Int) {
            TODO("implement me")
        }
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
