package arcs.android.host

import android.app.Service
import android.content.Intent
import android.os.IBinder
import arcs.android.sdk.host.ArcHostHelper
import arcs.core.host.ExternalHost
import arcs.core.data.PlanPartition
import arcs.sdk.Particle

class TestReadingExternalHostService : Service() {
    class ReadPerson : Particle

    private val arcHostHelper: ArcHostHelper by lazy {
        ArcHostHelper(this, ReadingExternalHost)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = super.onStartCommand(intent, flags, startId)
        arcHostHelper.onStartCommand(intent)
        return result
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object ReadingExternalHost : ExternalHost(ReadPerson()) {
        val started: MutableList<PlanPartition> = mutableListOf()
        override suspend fun startArc(partition: PlanPartition) {
            started += partition
        }

        override suspend fun stopArc(partition: PlanPartition) {
            started -= partition
        }

        fun reset() { started.clear() }
    }
}
