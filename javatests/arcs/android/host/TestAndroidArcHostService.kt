package arcs.android.host

import android.app.Service
import android.content.Intent
import android.os.IBinder

class TestAndroidArcHostService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null
}
