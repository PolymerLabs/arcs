/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.devtools

import android.app.Service
import android.content.Intent
import android.os.IBinder
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Implementation of [Service] for devtools to enable a [DevWebSocket] connection to a remote
 * device by exposing the [IDevToolsService] API.
 */
class DevToolsService : Service() {

    private val coroutineContext = Dispatchers.Default + CoroutineName("DevtoolsService")
    private val scope = CoroutineScope(coroutineContext)
    private lateinit var binder: DevToolsBinder
    private val devToolsServer = DevWebServerImpl

    override fun onCreate() {
        binder = DevToolsBinder(scope, devToolsServer)
        scope.launch {
            suspendCancellableCoroutine { cont ->
                cont.invokeOnCancellation {
                    devToolsServer.close()
                }
                devToolsServer.start()
                cont.resume(Unit) {}
            }
        }
    }

    override fun onBind(intent: Intent): IBinder? {
        return binder
    }

    override fun onDestroy() {
        super.onDestroy()
        devToolsServer.close()
        scope.cancel()
    }
}
