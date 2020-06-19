package arcs.android.demo

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.sdk.host.AndroidHost
import arcs.android.sdk.host.ArcHostService
import arcs.core.host.ArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.toRegistration
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.JvmTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * Service which wraps an ArcHost.
 */
class DemoService : ArcHostService() {

    private val coroutineContext = Job() + Dispatchers.Main

    private lateinit var notificationManager: NotificationManager

    override val arcHost = MyArcHost(
        this,
        this.lifecycle,
        JvmSchedulerProvider(coroutineContext),
        ::ReadPerson.toRegistration(),
        ::WritePerson.toRegistration()
    )

    override val arcHosts: List<ArcHost> by lazy { listOf(arcHost) }

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

    inner class MyArcHost(
        context: Context,
        lifecycle: Lifecycle,
        schedulerProvider: SchedulerProvider,
        vararg initialParticles: ParticleRegistration
    ) : AndroidHost(context, lifecycle, schedulerProvider, *initialParticles) {
        override val platformTime = JvmTime
    }

    inner class ReadPerson : AbstractReadPerson() {
        override fun onReady() {
            val name = handles.person.fetch()?.name ?: ""
            val notification =
                Notification.Builder(this@DemoService, "arcs-demo-service")
                    .setSmallIcon(R.drawable.notification_template_icon_bg)
                    .setContentTitle("onReady")
                    .setContentText(name)
                    .setAutoCancel(true)
                    .build()

            scope.launch {
                notificationManager.notify(handles.person.hashCode(), notification)
            }
        }
    }

    inner class WritePerson : AbstractWritePerson() {
        override fun onFirstStart() {
            handles.person.store(WritePerson_Person("John Wick"))
        }
    }
}
