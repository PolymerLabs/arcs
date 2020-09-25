package arcs.android.e2e.testapp

import android.app.Service
import android.content.Intent
import androidx.lifecycle.LifecycleService
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SingletonType
import arcs.core.entity.HandleSpec
import arcs.core.host.EntityHandleManager
import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.StoreManager
import arcs.core.util.Scheduler
import arcs.jvm.util.JvmTime
import arcs.sdk.WriteSingletonHandle
import arcs.sdk.android.storage.ServiceStoreFactory
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

@OptIn(ExperimentalCoroutinesApi::class)
class StorageAccessService : LifecycleService() {

  private val coroutineContext: CoroutineContext = Job() + Dispatchers.Main
  private val scope: CoroutineScope = CoroutineScope(coroutineContext)

  private val stores = StoreManager(
    activationFactory = ServiceStoreFactory(
      this@StorageAccessService
    )
  )

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    super.onStartCommand(intent, flags, startId)

    val actionOrdinal = intent?.getIntExtra(HANDLE_ACTION_EXTRA, 0)
    val action = actionOrdinal?.run { Action.values()[actionOrdinal] }

    val storageModeOrdinal = intent?.getIntExtra(STORAGE_MODE_EXTRA, 0)
    val storageMode: TestEntity.StorageMode? =
      storageModeOrdinal?.run { TestEntity.StorageMode.values()[storageModeOrdinal] }

    scope.launch {
      val handleManager = EntityHandleManager(
        time = JvmTime,
        scheduler = Scheduler(coroutineContext),
        storageEndpointManager = DirectStorageEndpointManager(stores)
      )

      @Suppress("UNCHECKED_CAST")
      val singletonHandle = handleManager.createHandle(
        HandleSpec(
          "singletonHandle",
          HandleMode.Write,
          SingletonType(EntityType(TestEntity.SCHEMA)),
          TestEntity
        ),
        when (storageMode) {
          TestEntity.StorageMode.PERSISTENT -> TestEntity.singletonPersistentStorageKey
          else -> TestEntity.singletonInMemoryStorageKey
        }
      ) as WriteSingletonHandle<TestEntity>

      singletonHandle.onReady {
        scope.launch {
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
          handleManager.close()
        }
      }
    }

    return Service.START_NOT_STICKY
  }

  override fun onDestroy() {
    scope.cancel()
    runBlocking {
      stores.reset()
    }
    super.onDestroy()
  }

  enum class Action {
    SET, CLEAR
  }

  companion object {
    const val IS_COLLECTION_EXTRA = "is_collection_extra"
    const val HANDLE_ACTION_EXTRA = "handle_action_extra"
    const val STORAGE_MODE_EXTRA = "storage_mode_extra"
  }
}
