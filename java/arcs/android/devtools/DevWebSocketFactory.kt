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
 * An extension of [NanoWSD] for devtools to connect Arcs to a remote device for debugging.
 */
class DevWebSocketFactory {

    fun getDevWebSocket() = devWebSocket

    companion object devWebSocket : NanoWSD("localhost", 33317) {
        private var wsdSocket: WsdSocket? = null
        private var started = false
        private val log = TaggedLog { "DevWebSocket" }

        /**
         * Send a string to the client.
         */
        fun send(msg: String) {
            if (wsdSocket?.open ?: false) {
                wsdSocket?.send(msg)
            } else {
                log.debug { "WebSocket Closed, can't send message [message=$msg]." }
            }
        }

        override fun openWebSocket(ihttpSession: NanoHTTPD.IHTTPSession?): WebSocket {
            wsdSocket = WsdSocket(ihttpSession, log)
            return wsdSocket!!
        }

        fun startIfNeeded() {
            if (!started) {
                super.start()
                started = true
            }
        }

        fun close() {
            wsdSocket?.close(CloseCode.NormalClosure, "Closing WebSocket", false)
            super.closeAllConnections()
            started = false
        }

        // TODO: This is a WIP for DevTools, still in flux.
        private class WsdSocket(
            handshakeRequest: NanoHTTPD.IHTTPSession?,
            val log: TaggedLog
        ) : WebSocket(handshakeRequest) {
            private val PING_PAYLOAD = "1337DEADBEEFC001".toByteArray()
            var open = false

            protected override fun onOpen() {
                try {
                    send("Socket Open")
                    ping(PING_PAYLOAD)
                    open = true
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
}
