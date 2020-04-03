package arcs.android.e2e.testapp

import android.app.Service
import android.content.Intent
import androidx.lifecycle.LifecycleService
import arcs.core.data.HandleMode
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleSpec
import arcs.core.host.EntityHandleManager
import arcs.jvm.util.JvmTime
import arcs.sdk.WriteSingletonHandle
import arcs.sdk.android.storage.ServiceStoreFactory
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class StorageAccessService : LifecycleService() {

    private val coroutineContext: CoroutineContext = Job() + Dispatchers.Main
    private val scope: CoroutineScope = CoroutineScope(coroutineContext)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)

        val actionOrdinal = intent?.getIntExtra(handleActionExtra, 0)
        val action = actionOrdinal?.run { Action.values()[actionOrdinal] }

        val storageModeOrdinal = intent?.getIntExtra(storageModeExtra, 0)
        val storageMode: TestEntity.StorageMode? =
            storageModeOrdinal?.run { TestEntity.StorageMode.values()[storageModeOrdinal] }

        scope.launch {
            val handleManager = EntityHandleManager(
                time = JvmTime,
                activationFactory = ServiceStoreFactory(
                    this@StorageAccessService,
                    lifecycle
                )
            )
            val singletonHandle = handleManager.createHandle(
                HandleSpec(
                    "singletonHandle",
                    HandleMode.Write,
                    HandleContainerType.Singleton,
                    TestEntity.Companion
                ),
                when (storageMode) {
                    TestEntity.StorageMode.PERSISTENT -> TestEntity.singletonPersistentStorageKey
                    else -> TestEntity.singletonInMemoryStorageKey
                }
            ) as WriteSingletonHandle<TestEntity>

            when (action) {
                Action.SET -> {
                    singletonHandle.store(
                        TestEntity(
                            text = TestEntity.text,
                            number = TestEntity.number,
                            boolean = TestEntity.boolean
                        )
                    )
                }
                Action.CLEAR -> {
                    singletonHandle.clear()
                }
            }

            singletonHandle.close()
        }

        return Service.START_NOT_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    enum class Action {
        SET, CLEAR
    }

    companion object {
        const val handleActionExtra = "handle_action_extra"
        const val storageModeExtra = "storage_mode_extra"
    }
}
