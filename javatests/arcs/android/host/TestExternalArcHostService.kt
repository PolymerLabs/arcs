package arcs.android.host

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import arcs.android.sdk.host.AndroidResurrector
import arcs.android.sdk.host.ArcHostHelper
import arcs.core.host.TestingHost
import arcs.core.data.Capabilities
import arcs.core.host.ParticleRegistration
import arcs.core.host.Resurrector
import arcs.core.host.TestingResurrector
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlinx.coroutines.Dispatchers

abstract class TestExternalArcHostService() : Service() {

    abstract val arcHost: TestingAndroidHost

    val resurrector = AndroidResurrector(this)

    val arcHostHelper: ArcHostHelper by lazy {
        ArcHostHelper(this, arcHost, resurrector)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = super.onStartCommand(intent, flags, startId)
        arcHostHelper.onStartCommand(intent)
        return result
    }

    override fun onBind(intent: Intent?): IBinder? = null

    class FakeLifecycle : Lifecycle() {
        override fun addObserver(p0: LifecycleObserver) = Unit
        override fun removeObserver(p0: LifecycleObserver) = Unit
        override fun getCurrentState(): State = State.CREATED
    }

    abstract class TestingAndroidHost(
        serviceContext: Context,
        resurrector: Resurrector,
        vararg particles: ParticleRegistration
    ) : TestingHost(resurrector, *particles) {

        override val stores = singletonStores

        override val activationFactory =  ServiceStoreFactory(
                serviceContext,
                FakeLifecycle(),
                Dispatchers.Default,
                testConnectionFactory
            )

        override val arcHostContextCapability = testingCapability
    }

    companion object {
        var testConnectionFactory: ConnectionFactory? = null
        var testingCapability = Capabilities.TiedToRuntime
    }
}
