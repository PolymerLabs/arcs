package arcs.sdk.android.storage

import android.app.Service
import android.content.Intent
import android.os.IBinder

class ResurrectionHelperDummyService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null
}


