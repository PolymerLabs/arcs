package arcs.android.devTools

import android.content.ContentValues
import android.util.Log
import fi.iki.elonen.NanoHTTPD
import fi.iki.elonen.NanoWSD
import java.io.IOException

class DevWebSocket : NanoWSD(12345) {
    var wsd : WsdSocket? = null
    override protected fun openWebSocket(ihttpSession: NanoHTTPD.IHTTPSession?): WebSocket {
        Log.d(ContentValues.TAG, "Opening websocket")
        wsd = WsdSocket(ihttpSession)
        return wsd ?: WsdSocket(ihttpSession)
    }

    fun send(msg: String) {
        wsd?.send(msg)
    }

    public class WsdSocket(handshakeRequest: NanoHTTPD.IHTTPSession?) : WebSocket(handshakeRequest) {
        private val PING_PAYLOAD = "1337DEADBEEFC001".toByteArray()

        override protected fun onOpen() {
            try {
                send("Socket Open")
                ping(PING_PAYLOAD)
            } catch (e: IOException) {
            }
            Log.d(ContentValues.TAG, "DWS: onOpen")
        }

        override protected fun onClose(code: WebSocketFrame.CloseCode?, reason: String, initiatedByRemote: Boolean) {
            Log.d(ContentValues.TAG, "DWS: onClose $reason$initiatedByRemote")
        }

        //override onOpen, onClose, onPong and onException methods
        override protected fun onMessage(webSocketFrame: WebSocketFrame) {
            try {
                send(webSocketFrame.getTextPayload().toString() + " to you")
            } catch (e: IOException) { // handle
            }
        }

        override protected fun onPong(pong: WebSocketFrame?) {
            ping(PING_PAYLOAD)
        }
        override protected fun onException(exception: IOException?) {}
    }
}
