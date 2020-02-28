package arcs.android.host

import android.app.Service
import android.content.Intent
import android.os.IBinder
import arcs.android.sdk.host.ArcHostHelper
import arcs.core.allocator.TestingHost
import arcs.core.host.EntityHandleManager
import arcs.sdk.Particle
import kotlin.reflect.KClass

open class TestExternalArcHostService(val arcHost: TestingHost) : Service() {
    val arcHostHelper: ArcHostHelper by lazy {
        ArcHostHelper(this, arcHost)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = super.onStartCommand(intent, flags, startId)
        arcHostHelper.onStartCommand(intent)
        return result
    }

    override fun onBind(intent: Intent?): IBinder? = null

    open class TestingAndroidHost(vararg particles: KClass<out Particle>) : TestingHost(*particles) {
        override fun entityHandleManager() = handleManager
    }

    companion object {
        lateinit var handleManager: EntityHandleManager
    }
}
