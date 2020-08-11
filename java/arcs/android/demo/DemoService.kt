package arcs.android.demo

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.host.AndroidHandleManagerProvider
import arcs.android.sdk.host.AndroidHost
import arcs.android.sdk.host.ArcHostService
import arcs.core.host.ArcHost
import arcs.core.host.HandleManagerProvider
import arcs.core.host.ParticleRegistration
import arcs.core.host.toRegistration
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * Service which wraps an ArcHost.
 */
@ExperimentalCoroutinesApi
class DemoService : ArcHostService() {

    private val coroutineContext = Job() + Dispatchers.Main

    private lateinit var notificationManager: NotificationManager

    val handleManagerProvider = AndroidHandleManagerProvider(
        context = this,
        schedulerCoroutineContext = Dispatchers.Default,
        serviceCoroutineContext = Dispatchers.Default
    )

    override val arcHost = MyArcHost(
        this,
        this.lifecycle,
        handleManagerProvider,
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

    @ExperimentalCoroutinesApi
    inner class MyArcHost(
        context: Context,
        lifecycle: Lifecycle,
        handleManagerProvider: HandleManagerProvider,
        vararg initialParticles: ParticleRegistration
    ) : AndroidHost(
        context = context,
        lifecycle = lifecycle,
        coroutineContext = Dispatchers.Default,
        arcSerializationContext = Dispatchers.Default,
        handleManagerProvider = handleManagerProvider,
        particles = *initialParticles
    )

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
