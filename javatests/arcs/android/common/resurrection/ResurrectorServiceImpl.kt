package arcs.android.common.resurrection

import android.content.Intent
import android.os.IBinder

class ResurrectorServiceImpl : ResurrectorService() {
    override fun onBind(intent: Intent?): IBinder? = null
}