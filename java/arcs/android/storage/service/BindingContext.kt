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

import android.os.IBinder
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
import arcs.core.storage.DriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreOptions
import arcs.core.storage.UntypedProxyMessage
import arcs.core.storage.WriteBackProvider
import arcs.core.util.statistics.TransactionStatisticsSink
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CoroutineScope
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
  driverFactory: DriverFactory,
  writeBackProvider: WriteBackProvider,
  private val devToolsProxy: DevToolsProxyImpl?
) {
  private val store = SuspendableLazy<ActiveStore<Data, Op, T>> {
    ActiveStore(options, scope, driverFactory, writeBackProvider, devToolsProxy)
  }

  suspend operator fun invoke() = store()
}

/**
 * A [BindingContext] is used by a client of the [StorageService] to facilitate communication with a
 * [ActiveStore] residing within the [StorageService] from elsewhere in an application.
 */
class BindingContext(
  /**
   * A method provided by the [StorageService] that will return the [ActiveStore] that this
   * [BindingContext needs]. We use this method to prevent the [BindingContext] from acting as a
   * GC root for the [ActiveStore], since [BindingContext] objects may stick around for a long
   * time.
   *
   * It's expected that the provided method will always return the same instance every time
   * it's called.
   */
  private val store: suspend () -> ActiveStore<*, *, *>,
  /**
   * [CoroutineScope] to which all of the implemented AIDL methods will be immediately dispatched.
   */
  private val scope: CoroutineScope,
  /** Sink to use for recording statistics about accessing data. */
  private val transactionStatisticsSink: TransactionStatisticsSink,
  private val devTools: DevToolsForStorage?,
  /** Callback to trigger when a proxy message has been received and sent to the store. */
  private val onProxyMessage: suspend (StorageKey, UntypedProxyMessage) -> Unit = { _, _ -> }
) : IStorageService.Stub() {
  @VisibleForTesting
  val id = nextId.incrementAndGet()

  private val actionLauncher = SequencedActionLauncher(scope)

  /** Here we track the registered death recipients, so we can unlinkToDeath when unregistering. */
  private val callbackTokens = mutableSetOf<Int>()

  /**
   * An implementation of [IBinder.DeathRecipient] that will remove a store callback if the client
   * process that added it died.
   *
   * This will be added when the first callback is attached, and unlinked from death when the last
   * callback is removed.
   */
  private val deathRecipient = IBinder.DeathRecipient {
    // Launch this on the action launcher, so it happens after any registrations that may
    // be in flight.
    actionLauncher.launch {
      @Suppress("UNCHECKED_CAST")
      callbackTokens.forEach { token ->
        (store() as ActiveStore<CrdtData, CrdtOperation, Any?>).off(token)
      }
      callbackTokens.clear()
    }
  }

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
      transactionStatisticsSink.traceAndMeasure("idle") {
        resultCallback.wrapException("idle failed") {
          withTimeout(timeoutMillis) {
            actionLauncher.waitUntilDone()
            store().idle()
          }
        }
      }
    }
  }

  override fun registerCallback(
    callback: IStorageServiceCallback,
    resultCallback: IRegistrationCallback
  ) {
    actionLauncher.launch {
      transactionStatisticsSink.traceTransaction("registerCallback") {
        try {
          @Suppress("UNCHECKED_CAST")
          val token = (store() as ActiveStore<CrdtData, CrdtOperation, Any?>).on { message ->
            // Asynchronously pass the message along to the callback. Use a supervisorScope here
            // so that we catch any exceptions thrown within and re-throw on the same coroutine
            // as the callback-caller.
            supervisorScope {
              callback.onProxyMessage(message.toProto().toByteArray())
            }
          }

          if (callbackTokens.size == 0) {
            this.asBinder().linkToDeath(deathRecipient, LINK_TO_DEATH_FLAGS)
          }

          callbackTokens.add(token)

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
      transactionStatisticsSink.traceAndMeasure("sendProxyMessage") {
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
      transactionStatisticsSink.traceTransaction("unregisterCallback") {
        callbackTokens.remove(token)
        // If this is the last callback we are tracking for this binding context, remove the
        // death listener.
        if (callbackTokens.size == 0) {
          this.asBinder().unlinkToDeath(deathRecipient, UNLINK_TO_DEATH_FLAGS)
        }
        // TODO(b/160706751) Clean up coroutine creation approach
        resultCallback.wrapException("unregisterCallback failed") {
          store().off(token)
        }
      }
    }
  }

  companion object {
    // The documentation provides no information about these flags, and any examples seem to
    // always use 0, so we use 0 here.
    const val UNLINK_TO_DEATH_FLAGS = 0
    const val LINK_TO_DEATH_FLAGS = 0

    private val nextId = atomic(0)
  }
}
