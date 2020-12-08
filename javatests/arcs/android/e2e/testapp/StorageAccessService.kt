package arcs.android.e2e.testapp

// TODO(b/170962663) Disabled due to different ordering after copybara transformations.
/* ktlint-disable import-ordering */
import android.app.Service
import androidx.lifecycle.LifecycleService
import android.content.Intent
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SingletonType
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.HandleSpec
import arcs.core.host.HandleManagerImpl
import arcs.core.util.Scheduler
import arcs.jvm.util.JvmTime
import arcs.sdk.WriteSingletonHandle
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.DefaultBindHelper
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

@OptIn(ExperimentalCoroutinesApi::class)
class StorageAccessService : LifecycleService() {

  private val scope = MainScope()

  private val storageEndpointManager = AndroidStorageServiceEndpointManager(
    scope,
    DefaultBindHelper(this)
  )

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    super.onStartCommand(intent, flags, startId)

    val actionOrdinal = intent?.getIntExtra(HANDLE_ACTION_EXTRA, 0)
    val action = actionOrdinal?.run { Action.values()[actionOrdinal] }

    val storageModeOrdinal = intent?.getIntExtra(STORAGE_MODE_EXTRA, 0)
    val storageMode: TestEntity.StorageMode? =
      storageModeOrdinal?.run { TestEntity.StorageMode.values()[storageModeOrdinal] }

    scope.launch {
      val handleManager = HandleManagerImpl(
        time = JvmTime,
        scheduler = Scheduler(coroutineContext),
        storageEndpointManager = storageEndpointManager,
        foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
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
