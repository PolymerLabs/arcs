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
import android.content.Intent
import android.os.IBinder
import arcs.storage.parcelables.ParcelableProxyMessage

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
}
