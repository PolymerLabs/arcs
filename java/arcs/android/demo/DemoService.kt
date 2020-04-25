package arcs.android.demo

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.lifecycle.Lifecycle
import arcs.android.sdk.host.ArcHostService
import arcs.android.sdk.host.androidArcHostConfiguration
import arcs.core.host.AbstractArcHost
import arcs.core.host.ArcHost
import arcs.core.host.BaseArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.toRegistration
import arcs.jvm.util.JvmTime
import arcs.sdk.Handle
import kotlin.coroutines.CoroutineContext
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
        context = this,
        lifecycle = this.lifecycle,
        coroutineContext = coroutineContext,
        initialParticles = *arrayOf(
            ::ReadPerson.toRegistration(),
            ::WritePerson.toRegistration()
        )
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
        coroutineContext: CoroutineContext,
        vararg initialParticles: ParticleRegistration
    ) : BaseArcHost(
        androidArcHostConfiguration(
            context = context,
            lifecycle = lifecycle,
            parentCoroutineContext = coroutineContext
        ),
        *initialParticles
    )

    inner class ReadPerson : AbstractReadPerson() {
        override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
            val name = handles.person.fetch()?.name ?: ""
            val notification =
                Notification.Builder(this@DemoService, "arcs-demo-service")
                    .setSmallIcon(R.drawable.notification_template_icon_bg)
                    .setContentTitle("onHandleSync")
                    .setContentText(name)
                    .setAutoCancel(true)
                    .build()

            scope.launch {
                notificationManager.notify(handle.hashCode(), notification)
            }
        }
    }

    inner class WritePerson : AbstractWritePerson() {
        override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
            handles.person.store(WritePerson_Person("John Wick"))
        }
    }
}
