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
import fi.iki.elonen.NanoHTTPD
import fi.iki.elonen.NanoWSD
import fi.iki.elonen.NanoWSD.WebSocketFrame.CloseCode
import java.io.IOException

/**
 * An extension of [NanoWSD] and implementaiton of [DevWebServer] for devtools to connect Arcs to a
 * remote device for debugging.
 */
object DevWebServerImpl : DevWebServer, NanoWSD("localhost", 33317) {

    private val wsdSockets = mutableSetOf<WsdSocket>()
    private val log = TaggedLog { "DevWebSocket" }
    private val onOpenSocketCallbacks = mutableListOf<() -> String>()

    /**
     * Send a string to the client.
     */
    override fun send(msg: String) {
        wsdSockets.forEach { socket ->
            socket.send(msg)
        }
    }

    override fun openWebSocket(ihttpSession: NanoHTTPD.IHTTPSession?): WebSocket {
        val socket = WsdSocket(ihttpSession, log) { socket ->
            wsdSockets.remove(socket)
        }
        wsdSockets.add(socket)

        return socket
    }

    fun close() {
        wsdSockets.forEach { socket ->
            socket.close(CloseCode.NormalClosure, "Closing WebSocket", false)
        }
        wsdSockets.clear()
        super.closeAllConnections()
    }

    fun addOnOpenWebsocketCallback(callback: () -> String) {
        onOpenSocketCallbacks.add(callback)
    }

    // TODO: This is a WIP for DevTools, still in flux.
    private class WsdSocket(
        handshakeRequest: NanoHTTPD.IHTTPSession?,
        val log: TaggedLog,
        val removeCallback: (WsdSocket) -> Unit
    ) : WebSocket(handshakeRequest) {
        private val PING_PAYLOAD = "1337DEADBEEFC001".toByteArray()
        var open = false

        protected override fun onOpen() {
            try {
                send("Socket Open")
                ping(PING_PAYLOAD)
                open = true
                onOpenSocketCallbacks.forEach { callback ->
                    send(callback())
                }
            } catch (e: IOException) {
                log.error(e) { "Error opening WebSocket [message=${e.message}]." }
            }
        }

        protected override fun onClose(
            code: WebSocketFrame.CloseCode?,
            reason: String,
            initiatedByRemote: Boolean
        ) {
            log.debug { "Websocket closed. [reason=$reason]." }
            open = false
            removeCallback(this)
        }

        protected override fun onMessage(webSocketFrame: WebSocketFrame) {
            try {
                send(webSocketFrame.getTextPayload().toString() + " to you")
            } catch (e: IOException) {
                log.error(e) {
                    "Error receiving message from WebSocket [message=${e.message}]."
                }
            }
        }

        // To maintain the websocket connection, we need to maintain a ping/pong.
        protected override fun onPong(pong: WebSocketFrame?) {
            ping(PING_PAYLOAD)
        }

        protected override fun onException(exception: IOException?) {
            log.error(exception) { "Exception with Websocket [message=${exception?.message}]." }
        }
    }
}
