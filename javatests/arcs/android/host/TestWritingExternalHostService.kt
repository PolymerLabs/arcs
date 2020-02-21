package arcs.android.host

import android.app.Service
import android.content.Intent
import android.os.IBinder
import arcs.android.sdk.host.ArcHostHelper
import arcs.core.data.Plan
import arcs.core.host.ExternalHost
import arcs.sdk.Particle

class TestWritingExternalHostService : Service() {
    class WritePerson : Particle

    private val arcHostHelper: ArcHostHelper by lazy {
        ArcHostHelper(this, WritingExternalHost)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = super.onStartCommand(intent, flags, startId)
        arcHostHelper.onStartCommand(intent)
        return result
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object WritingExternalHost : ExternalHost(WritePerson()) {
        val started: MutableList<Plan.Partition> = mutableListOf()
        override suspend fun startArc(partition: Plan.Partition) {
            started += partition
        }

        override suspend fun stopArc(partition: Plan.Partition) {
            started -= partition
        }

        fun reset() { started.clear() }
    }
}
