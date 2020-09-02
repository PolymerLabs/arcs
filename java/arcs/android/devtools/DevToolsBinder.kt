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

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Implementation of [IDevToolsService].
 */
class DevToolsBinder(
    val scope: CoroutineScope,
    private val webServer: DevWebServer
) : IDevToolsService.Stub() {

    override fun send(str: String) {
        scope.launch {
            webServer.send(str)
        }
    }
}
