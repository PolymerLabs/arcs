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
import arcs.core.host.AbstractWritePerson
import arcs.core.host.ReadPerson_Person
import arcs.core.host.TestHostHandleHolder
import arcs.core.host.WritePerson_Person
import arcs.core.storage.ActivationFactory
import arcs.core.storage.handle.ExperimentalHandleApi
import arcs.core.storage.handle.HandleManager
import arcs.jvm.host.JvmExternalHost
import arcs.sdk.Handle
import arcs.sdk.ReadableSingleton
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.async


class TestWritingExternalHostService : Service() {

    override fun onCreate() {
        super.onCreate()
    }

    class WritePerson : AbstractWritePerson() {
        override fun onHandleSync(handle: Handle, allSync: Boolean) {
            GlobalScope.async {
                handles.person.set(WritePerson_Person("John Wick5"))
                val x = true
            }
        }
    }


    public val arcHost = WritingExternalHost()
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

    inner class WritingExternalHost : JvmExternalHost(WritePerson::class) {
        val started: MutableList<PlanPartition> = mutableListOf()
        override suspend fun startArc(partition: PlanPartition) {
            started += partition
            super.startArc(partition)
        }

        override suspend fun stopArc(partition: PlanPartition) {
            started -= partition
            super.stopArc(partition)
        }

        fun reset() { started.clear() }

        override fun handleManager() = AndroidHandleManager(
            InstrumentationRegistry.getInstrumentation().targetContext,
            TestWritingExternalHostService.FakeLifecycle(),
            Dispatchers.Default,
            DefaultConnectionFactory(
                InstrumentationRegistry.getInstrumentation().targetContext,
                TestBindingDelegate.delegate!!
            )
        )
    }
}
