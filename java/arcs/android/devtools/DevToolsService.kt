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
import arcs.core.util.CoreDispatchers
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.cancel

/**
 * Implementation of [Service] for devtools to enable a [DevWebSocket] connection to a remote
 * device by exposing the [IDevToolsService] API.
 */
class DevToolsService : Service() {

    private val coroutineContext = CoreDispatchers.Default + CoroutineName("DevtoolsService")
    private val scope = CoroutineScope(coroutineContext)
    private val binder = DevToolsBinder(scope)

    override fun onBind(intent: Intent): IBinder? {
        binder.start()
        return binder
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
