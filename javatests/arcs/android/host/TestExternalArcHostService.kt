package arcs.android.host

import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import androidx.test.platform.app.InstrumentationRegistry
import arcs.android.sdk.host.ArcHostHelper
import arcs.android.storage.handle.AndroidHandleManager
import arcs.core.allocator.TestingHost
import arcs.core.host.EntityHandleManager
import arcs.sdk.Particle
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import kotlinx.coroutines.Dispatchers
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

    class FakeLifecycle : Lifecycle() {
        override fun addObserver(p0: LifecycleObserver) = Unit
        override fun removeObserver(p0: LifecycleObserver) = Unit
        override fun getCurrentState(): State = State.CREATED
    }

    open class TestingAndroidHost(vararg particles: KClass<out Particle>) : TestingHost(*particles) {
        override fun entityHandleManager() = EntityHandleManager(
            AndroidHandleManager(
                InstrumentationRegistry.getInstrumentation().targetContext,
                FakeLifecycle(),
                Dispatchers.Default,
                DefaultConnectionFactory(
                    InstrumentationRegistry.getInstrumentation().targetContext,
                    TestBindingDelegate.delegate!!
                )
            )
        )
    }
}
