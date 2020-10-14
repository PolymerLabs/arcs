/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.storage.service

import androidx.annotation.VisibleForTesting
import arcs.android.crdt.toProto
import arcs.android.storage.decodeProxyMessage
import arcs.android.storage.toProto
import arcs.core.common.SuspendableLazy
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ActiveStore
import arcs.core.storage.DevToolsForStorage
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreOptions
import arcs.core.storage.WriteBackProvider
import kotlin.coroutines.CoroutineContext
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.withTimeout

/**
 * This class wraps an [ActiveStore] constructor. The first time an instance of this class is
 * invoked, the store instance is created.
 *
 * This allows us to create a [BindingContext] without blocking the thread that the bind call
 * occurs on.
 */
class DeferredStore<Data : CrdtData, Op : CrdtOperation, T>(
  options: StoreOptions,
  scope: CoroutineScope,
  writeBackProvider: WriteBackProvider,
  private val devToolsProxy: DevToolsProxyImpl?
) {
  private val store = SuspendableLazy<ActiveStore<Data, Op, T>> {
    ActiveStore(options, scope, writeBackProvider, devToolsProxy)
  }

  suspend operator fun invoke() = store()
}

/**
 * A [BindingContext] is used by a client of the [StorageService] to facilitate communication with a
 * [ActiveStore] residing within the [StorageService] from elsewhere in an application.
 */
class BindingContext(
  /**
   * The [ActiveStore] this [BindingContext] provides bindings for, it may or may not be shared with
   * other instances of [BindingContext].
   */
  private val store: DeferredStore<*, *, *>,
  /** [CoroutineContext] on which to build one specific to this [BindingContext]. */
  parentCoroutineContext: CoroutineContext,
  /** Sink to use for recording statistics about accessing data. */
  private val bindingContextStatisticsSink: BindingContextStatisticsSink,
  private val devTools: DevToolsForStorage?,
  /** Callback to trigger when a proxy message has been received and sent to the store. */
  private val onProxyMessage: suspend (StorageKey, ProxyMessage<*, *, *>) -> Unit = { _, _ -> }
) : IStorageService.Stub() {
  @VisibleForTesting
  val id = nextId.incrementAndGet()

  /**
   * The local [CoroutineContext], and a [CoroutineScope] that wraps it.
   *
   * All of the implemented AIDL methods will be immediately dispatched using this scope.
   * TODO(b/162954543) - Just pass in a scope at construction
   */
  private val job = Job(parentCoroutineContext[Job])
  private val coroutineContext =
    parentCoroutineContext + job + CoroutineName("BindingContext-$id")
  private val scope = CoroutineScope(coroutineContext)

  private val actionLauncher = SequencedActionLauncher(scope)

  /**
   * Signals idle state via the provided [resultCallback].
   *
   * The resultCallback is guaranteed to be called after any service requests issued on this
   * binding have completed their work. It might also wait for calls issued after this idle
   * request.
   *
   * After the first time the binding reaches 0 active messages in flight, we wait for the
   * [store] managed by this context to become idle as well, and then signal the caller via the
   * provided callback.
   */
  override fun idle(timeoutMillis: Long, resultCallback: IResultCallback) {
    // This should *not* be wrapped in the actionLauncher, since we don't want an idle call to wait
    // for other idle calls to complete.
    scope.launch {
      bindingContextStatisticsSink.traceAndMeasure("idle") {
        resultCallback.wrapException("idle failed") {
          withTimeout(timeoutMillis) {
            actionLauncher.waitUntilDone()
            store().idle()
          }
        }
      }
    }
  }

  @Suppress("UNCHECKED_CAST")
  override fun registerCallback(
    callback: IStorageServiceCallback,
    resultCallback: IRegistrationCallback
  ) {
    actionLauncher.launch {
      bindingContextStatisticsSink.traceTransaction("registerCallback") {
        try {
          val token = (store() as ActiveStore<CrdtData, CrdtOperation, Any?>).on { message ->
            // Asynchronously pass the message along to the callback. Use a supervisorScope here
            // so that we catch any exceptions thrown within and re-throw on the same coroutine
            // as the callback-caller.
            supervisorScope {
              callback.onProxyMessage(message.toProto().toByteArray())
            }
          }

          // If the callback's binder dies, remove it from the callback collection.
          callback.asBinder().linkToDeath(
            {
              scope.launch {
                (store() as ActiveStore<CrdtData, CrdtOperation, Any?>).off(token)
              }
            },
            0
          )
          resultCallback.onSuccess(token)
        } catch (e: Exception) {
          resultCallback.onFailure(
            CrdtException("registerCallback failed", e)
              .toProto()
              .toByteArray()
          )
        }
      }
    }
  }

  @Suppress("UNCHECKED_CAST")
  override fun sendProxyMessage(
    proxyMessage: ByteArray,
    resultCallback: IResultCallback
  ) {
    actionLauncher.launch {
      bindingContextStatisticsSink.traceAndMeasure("sendProxyMessage") {
        // Acknowledge client immediately, for best performance.
        resultCallback.takeIf { it.asBinder().isBinderAlive }?.onResult(null)

        val actualMessage = proxyMessage.decodeProxyMessage()

        val store = store() as ActiveStore<CrdtData, CrdtOperation, Any?>
        store.onProxyMessage(actualMessage)
        onProxyMessage(store.storageKey, actualMessage)
      }
    }
  }

  override fun unregisterCallback(
    token: Int,
    resultCallback: IResultCallback
  ) {
    actionLauncher.launch {
      bindingContextStatisticsSink.traceTransaction("unregisterCallback") {
        // TODO(b/160706751) Clean up coroutine creation approach
        resultCallback.wrapException("unregisterCallback failed") {
          store().off(token)
        }
      }
    }
  }

  companion object {
    private val nextId = atomic(0)
  }
}
