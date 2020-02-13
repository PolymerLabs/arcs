package arcs.android.host

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import androidx.test.platform.app.InstrumentationRegistry
import arcs.android.crdt.ParcelableCrdtType
import arcs.android.sdk.host.ArcHostHelper
import arcs.android.storage.handle.AndroidHandleManager
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.PlanPartition
import arcs.core.data.RawEntity
import arcs.core.host.AbstractReadPerson
import arcs.core.host.TestHostHandleHolder
import arcs.core.storage.ActivationFactory
import arcs.core.storage.handle.ExperimentalHandleApi
import arcs.core.storage.handle.HandleManager
import arcs.jvm.host.JvmExternalHost
import arcs.sdk.Handle
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.async

class TestReadingExternalHostService : Service() {
    override fun onCreate() {
        super.onCreate()
    }

    class ReadPerson : AbstractReadPerson() {
        override fun onHandleUpdate(handle: Handle) {
            GlobalScope.async {
                val name = handles.person.fetch()?.name
                val x = true
            }
        }

        override fun onHandleSync(handle: Handle, allSynced: Boolean) {
            GlobalScope.async {
                val name = handles.person.fetch()?.name
                val x = true
            }
        }
    }

    val arcHost = ReadingExternalHost()
    private val arcHostHelper: ArcHostHelper by lazy {
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

    inner class ReadingExternalHost : JvmExternalHost(ReadPerson::class) {
        val started: MutableList<PlanPartition> = mutableListOf()
        override suspend fun startArc(partition: PlanPartition) {
            started += partition
            super.startArc(partition)
        }

        override suspend fun stopArc(partition: PlanPartition) {
            started -= partition
            super.stopArc(partition)
        }

        override fun handleManager() = AndroidHandleManager(
            InstrumentationRegistry.getInstrumentation().targetContext,
            TestReadingExternalHostService.FakeLifecycle(),
            Dispatchers.Default,
            DefaultConnectionFactory(
                InstrumentationRegistry.getInstrumentation().targetContext,
                TestBindingDelegate.delegate!!
            )
        )

        fun reset() { started.clear() }
    }
}
