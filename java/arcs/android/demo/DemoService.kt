package arcs.android.demo

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import arcs.android.sdk.host.ArcHostHelper
import arcs.core.host.AbstractArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.toRegistration
import arcs.jvm.util.JvmTime
import arcs.sdk.Handle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Service which wraps an ArcHost.
 */
class DemoService : Service() {

    private val coroutineContext = Job() + Dispatchers.Main
    private val scope = CoroutineScope(coroutineContext)

    private lateinit var notificationManager: NotificationManager

    private val myHelper: ArcHostHelper by lazy {
        val host = MyArcHost(
            ::ReadPerson.toRegistration(),
            ::WritePerson.toRegistration()
        )
        ArcHostHelper(this, host)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)

        myHelper.onStartCommand(intent)

        return START_NOT_STICKY
    }

    override fun onCreate() {
        super.onCreate()

        notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.createNotificationChannel(
            NotificationChannel(
                "arcs-demo-service",
                "arcs-demo-service",
                NotificationManager.IMPORTANCE_HIGH
            )
        )
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        coroutineContext.cancelChildren()
        super.onDestroy()
    }

    class MyArcHost(
        vararg initialParticles: ParticleRegistration
    ) : AbstractArcHost(*initialParticles) {
        override val platformTime = JvmTime
    }

    inner class ReadPerson : AbstractReadPerson() {

        override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
            scope.launch {
                val name = withContext(Dispatchers.IO) { handles.person.fetch()?.name ?: "" }
                val notification =
                    Notification.Builder(this@DemoService, "arcs-demo-service")
                        .setSmallIcon(R.drawable.notification_template_icon_bg)
                        .setContentTitle("onHandleSync")
                        .setContentText(name)
                        .setAutoCancel(true)
                        .build()

                notificationManager.notify(handle.hashCode(), notification)
            }
        }
    }

    inner class WritePerson : AbstractWritePerson() {

        override suspend fun onHandleSync(handle: Handle, allSync: Boolean) {
            handles.person.store(WritePerson_Person("John Wick"))
        }
    }
}
