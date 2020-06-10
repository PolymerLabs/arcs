package arcs.android.devTools

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ContentValues.TAG
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Binder
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.os.Message
import android.util.Log
import android.widget.Toast

class DevToolsService : Service() {

    // Binder given to clients
    protected val binder = LocalBinder()
    protected var serviceLooper: Looper? = null
    protected var serviceHandler: ServiceHandler? = null
    protected var webSocket : DevWebSocket? = null;

    /**
     * Class used for the client Binder.  Because we know this service always
     * runs in the same process as its clients, we don't need to deal with IPC.
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
        Log.d("DevToolsService", "I'm bound!")
        webSocket?.start()
        return binder
    }

    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        serviceHandler?.obtainMessage()?.also { msg ->
            msg.arg1 = startId
            serviceHandler?.sendMessage(msg)
        }
        //super.onStartCommand(intent, flags, startId)

        // If we get killed, after returning from here, restart
        return START_STICKY
    }

    // Handler that receives messages from the thread
    protected inner class ServiceHandler(looper: Looper) : Handler(looper) {

        override fun handleMessage(msg: Message) {
            // Normally we would do some work here, like download a file.
            // For our sample, we just sleep for 5 seconds.
            try {
                webSocket?.send(msg.data.getString("message", ""))
            } catch (e: InterruptedException) {
                // Restore interrupt status.
                Thread.currentThread().interrupt()
            }

            // Stop the service using the startId, so that we don't stop
            // the service in the middle of handling another job
            //stopSelf(msg.arg1)
        }
    }



    override fun onCreate() {
        // Start up the thread running the service.  Note that we create a
        // separate thread because the service normally runs in the process's
        // main thread, which we don't want to block.  We also make it
        // background priority so CPU-intensive work will not disrupt our UI.
        HandlerThread("ServiceStartArguments").apply {
            start()

            // Get the HandlerThread's Looper and use it for our Handler
            Log.d(TAG, "DWS: Servive Starting")
            serviceLooper = looper
            serviceHandler = ServiceHandler(looper)
            webSocket = DevWebSocket();
        }
    }

    override fun onDestroy() {
        Toast.makeText(this, "service done", Toast.LENGTH_SHORT).show()
        Log.d(TAG, "Shutting down service")
    }
}
