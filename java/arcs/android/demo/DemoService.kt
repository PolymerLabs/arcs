package arcs.android.demo

// TODO(b/170962663) Disabled due to different ordering after copybara transformations.
/* ktlint-disable import-ordering */
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import androidx.lifecycle.Lifecycle
import android.content.Context
import arcs.android.sdk.host.AndroidHost
import arcs.android.sdk.host.ArcHostService
import arcs.core.host.ArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.host.toRegistration
import arcs.jvm.util.JvmTime
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.DefaultBindHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * Service which wraps an ArcHost.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class DemoService : ArcHostService() {

  private val coroutineContext = Job() + Dispatchers.Main

  private lateinit var notificationManager: NotificationManager

  override val arcHost = MyArcHost(
    this,
    this.lifecycle,
    SimpleSchedulerProvider(coroutineContext),
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

  private val storageEndpointManager = AndroidStorageServiceEndpointManager(
    scope,
    DefaultBindHelper(this)
  )

  @OptIn(ExperimentalCoroutinesApi::class)
  inner class MyArcHost(
    context: Context,
    lifecycle: Lifecycle,
    schedulerProvider: SchedulerProvider,
    vararg initialParticles: ParticleRegistration
  ) : AndroidHost(
    context = context,
    lifecycle = lifecycle,
    auxiliaryScope = CoroutineScope(Dispatchers.Default),
    arcSerializationScope = CoroutineScope(Dispatchers.Default),
    schedulerProvider = schedulerProvider,
    storageEndpointManager = storageEndpointManager,
    particles = *initialParticles
  ) {
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
