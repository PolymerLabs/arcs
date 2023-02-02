package arcs.sdk.android.storage.service

import arcs.android.storage.service.IHardReferencesRemovalCallback
import arcs.android.storage.service.IResultCallback
import arcs.android.storage.service.IStorageServiceManager
import arcs.android.storage.service.StorageServiceManager
import arcs.android.storage.service.suspendForHardReferencesCallback
import arcs.android.storage.service.suspendForResultCallback
import arcs.core.data.Schema
import arcs.core.storage.keys.ForeignStorageKey
import kotlinx.coroutines.CoroutineScope

/**
 * Implementation of [StorageServiceManagerEndpoint] that binds to an Android [StorageServiceManager]
 * and calls its callback-style methods.
 */
class StorageServiceManagerEndpointImpl(
  private val bindHelper: BindHelper,
  private val scope: CoroutineScope,
  private val storageServiceClass: Class<*> = StorageService::class.java
) : StorageServiceManagerEndpoint {

  override suspend fun triggerForeignHardReferenceDeletion(namespace: Schema, id: String): Long {
    return runOnStorageServiceManager { manager, result ->
      manager.triggerHardReferenceDeletion(stringForeignStorageKey(namespace), id, result)
    }
  }

  override suspend fun reconcileForeignHardReference(
    namespace: Schema,
    idsToRetain: Set<String>
  ): Long {
    return runOnStorageServiceManager { manager, result ->
      manager.reconcileHardReferences(
        stringForeignStorageKey(namespace),
        idsToRetain.toList(),
        result
      )
    }
  }

  override suspend fun runGarbageCollection() {
    runIResultCallbackOnStorageServiceManager { manager, callback ->
      manager.runGarbageCollection(callback)
    }
  }

  /**
   * Binds to the IStorageServiceManager, and runs the given block on it. It can be used to run one
   * of the methods that take a [IResultCallback].
   */
  private suspend fun runIResultCallbackOnStorageServiceManager(
    block: (IStorageServiceManager, IResultCallback) -> Unit
  ): Boolean {
    return withBoundService {
      suspendForResultCallback { resultCallback ->
        block(it, resultCallback)
      }
    }
  }

  private suspend fun runOnStorageServiceManager(
    block: (IStorageServiceManager, IHardReferencesRemovalCallback) -> Unit
  ): Long {
    return withBoundService {
      suspendForHardReferencesCallback { resultCallback ->
        block(it, resultCallback)
      }
    }
  }

  private suspend fun <T> withBoundService(block: suspend (IStorageServiceManager) -> T): T {
    val intent = StorageServiceIntentHelpers.managerIntent(bindHelper.context, storageServiceClass)
    val boundService = bindHelper.bindForIntent(
      intent,
      scope,
      IStorageServiceManager.Stub::asInterface
    )
    try {
      return block(boundService.service)
    } finally {
      boundService.disconnect()
    }
  }

  private fun stringForeignStorageKey(namespace: Schema) = ForeignStorageKey(namespace).toString()
}
