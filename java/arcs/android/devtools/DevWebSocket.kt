package arcs.android.devtools

import android.content.ContentValues.TAG
import android.util.Log
import fi.iki.elonen.NanoHTTPD
import fi.iki.elonen.NanoWSD
import java.io.IOException

class DevWebSocket : NanoWSD(12345) {
    var wsd: WsdSocket? = null
    protected override fun openWebSocket(ihttpSession: NanoHTTPD.IHTTPSession?): WebSocket {
        wsd = WsdSocket(ihttpSession)
        return wsd ?: WsdSocket(ihttpSession)
    }

    fun send(msg: String) {
        wsd?.send(msg)
    }

    private class WsdSocket(
        handshakeRequest: NanoHTTPD.IHTTPSession?
    ) : WebSocket(handshakeRequest) {
        private val PING_PAYLOAD = "1337DEADBEEFC001".toByteArray()

        protected override fun onOpen() {
            try {
                send("Socket Open")
                ping(PING_PAYLOAD)
            } catch (e: IOException) {
            }
        }

        protected override fun onClose(
            code: WebSocketFrame.CloseCode?,
            reason: String,
            initiatedByRemote: Boolean
        ) {
            Log.d(TAG, "Websocket closed. Reason: $reason")
        }

        protected override fun onMessage(webSocketFrame: WebSocketFrame) {
            try {
                send(webSocketFrame.getTextPayload().toString() + " to you")
            } catch (e: IOException) {
            }
        }

        // To maintain the websocket connection, we need to maintain a ping/pong.
        protected override fun onPong(pong: WebSocketFrame?) {
            ping(PING_PAYLOAD)
        }
        protected override fun onException(exception: IOException?) {}
    }
}
