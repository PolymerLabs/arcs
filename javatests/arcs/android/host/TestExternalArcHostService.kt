package arcs.android.host

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import arcs.android.sdk.host.ArcHostHelper
import arcs.android.sdk.host.ResurrectableHost
import arcs.core.data.Capabilities
import arcs.core.host.ParticleRegistration
import arcs.core.host.SchedulerProvider
import arcs.core.host.TestingHost
import arcs.sdk.android.storage.ResurrectionHelper
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.ConnectionFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel

abstract class TestExternalArcHostService : Service() {
    protected val scope: CoroutineScope = MainScope()

    abstract val arcHost: TestingAndroidHost

    val arcHostHelper: ArcHostHelper by lazy {
        ArcHostHelper(this, arcHost)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = super.onStartCommand(intent, flags, startId)
        arcHostHelper.onStartCommand(intent)
        return result
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    class FakeLifecycle : Lifecycle() {
        override fun addObserver(p0: LifecycleObserver) = Unit
        override fun removeObserver(p0: LifecycleObserver) = Unit
        override fun getCurrentState(): State = State.CREATED
    }

    abstract class TestingAndroidHost(
        context: Context,
        schedulerProvider: SchedulerProvider,
        vararg particles: ParticleRegistration
    ) : TestingHost(schedulerProvider, *particles), ResurrectableHost {
        override val stores = singletonStores

        override val resurrectionHelper: ResurrectionHelper =
            ResurrectionHelper(context, ::onResurrected)

        @kotlinx.coroutines.ExperimentalCoroutinesApi
        override val activationFactory =  ServiceStoreFactory(
                context,
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
