package arcs.android.devtools

import android.app.Service
import android.content.Intent
import android.os.Binder
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.os.Message

class DevToolsService : Service() {

    // Binder given to clients
    private val binder = LocalBinder()
    private lateinit var serviceLooper: Looper
    private lateinit var serviceHandler: ServiceHandler
    private lateinit var webSocket: DevWebSocket

    /**
     * Class used for the client Binder.
     */
    inner class LocalBinder : Binder() {
        // Return this instance of LocalService so clients can call public methods
        fun getService(): DevToolsService = this@DevToolsService
    }

    fun send(str: String) {
        val bun = Bundle()
        bun.putString("message", str)
        val msg = Message()
        msg.setData(bun)
        serviceHandler?.sendMessage(msg)
    }

    override fun onBind(intent: Intent): IBinder? {
        webSocket.start()
        return binder
    }

    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        serviceHandler?.obtainMessage()?.also { msg ->
            msg.arg1 = startId
            serviceHandler?.sendMessage(msg)
        }

        return START_STICKY
    }

    override fun onCreate() {
        HandlerThread("DevToolsService").apply {
            start()
            serviceLooper = looper
            serviceHandler = ServiceHandler(looper)
            webSocket = DevWebSocket()
        }
    }

    protected inner class ServiceHandler(looper: Looper) : Handler(looper) {

        override fun handleMessage(msg: Message) {
            try {
                webSocket?.send(msg.data.getString("message", ""))
            } catch (e: InterruptedException) {
                // Restore interrupt status.
                Thread.currentThread().interrupt()
            }
        }
    }
}
