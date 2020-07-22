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

import arcs.core.util.TaggedLog
import java.lang.Exception
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Implementation of [IDevToolsService].
 */
class DevToolsBinder(val scope: CoroutineScope) : IDevToolsService.Stub() {
    private var webSocket: DevWebSocketFactory.devWebSocket? = null
    private val log = TaggedLog { "DevToolsBinder" }

    override fun send(str: String) {
        scope.launch {
            webSocket?.send(str)
        }
    }

    @kotlinx.coroutines.ExperimentalCoroutinesApi
    override fun start() {
        scope.launch {
            try {
                suspendCancellableCoroutine { cont ->
                    webSocket = webSocket ?: DevWebSocketFactory().getDevWebSocket()
                    cont.invokeOnCancellation {
                        webSocket?.close()
                    }
                    webSocket?.startIfNeeded()
                    cont.resume(Unit) {}
                }
            } catch (e: Exception) {
                log.debug(e) { "Can't open Websocket. Error: [$e]." }
            }
        }
    }

    override fun close() {
        webSocket?.close()
        webSocket = null
    }

    fun destroy() {
        close()
    }
}
