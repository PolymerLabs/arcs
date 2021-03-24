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

package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.VersionMap
import arcs.core.storage.StorageProxy.CallbackIdentifier
import arcs.core.storage.StorageProxy.StorageEvent
import arcs.core.util.Scheduler
import arcs.core.util.TaggedLog
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred

/**
 * The default WriteOnly implementation of a [StorageProxy]. It does not keep a crdt model, any
 * state, and cannot respond to messages from downstream.
 */
@Suppress("EXPERIMENTAL_API_USAGE")
class WriteOnlyStorageProxyImpl<Data : CrdtData, Op : CrdtOperation, T> private constructor(
  override val storageKey: StorageKey,
  private val scheduler: Scheduler
) : StorageProxy<Data, Op, T>, StorageProxyImplBase<Data, Op, T>(scheduler) {

  private val log = TaggedLog { "WriteOnlyStorageProxy" }
  private var closed = atomic(false)

  override fun closeInternal() {
    closed.update { true }
  }

  override fun isClosed() = closed.value

  // WriteOnly proxies do not perform sync requests.
  override fun prepareForSync() = Unit

  override fun maybeInitiateSync() = Unit

  // WriteOnly proxies are immediately ready.
  override fun registerForStorageEvents(id: CallbackIdentifier, notify: (StorageEvent) -> Unit) {
    checkNotClosed()
    notify(StorageEvent.READY)
  }

  // WriteOnly proxies can't have errors as there are no events.
  override fun setErrorCallbackForHandleEvents(callback: (Exception) -> Unit) = Unit

  // Handle onReady callbacks are invoked once, immediately.
  override fun addOnReady(id: CallbackIdentifier, action: () -> Unit) {
    checkNotClosed()
    scheduler.schedule(HandleCallbackTask(id, "onReady(immediate)", action))
  }

  // None of the following callbacks are present on write-only handles.
  override fun addOnUpdate(id: CallbackIdentifier, action: (oldValue: T, newValue: T) -> Unit) =
    throw UnsupportedOperationException("Events not supported for WriteOnlyStorageProxy")

  override fun addOnDesync(id: CallbackIdentifier, action: () -> Unit) =
    throw UnsupportedOperationException("Events not supported for WriteOnlyStorageProxy")

  override fun addOnResync(id: CallbackIdentifier, action: () -> Unit) =
    throw UnsupportedOperationException("Events not supported for WriteOnlyStorageProxy")

  // Not needed, because no callbacks except onReady are invoked, which is synchronous.
  override fun removeCallbacksForName(id: CallbackIdentifier) = Unit

  override fun applyOps(ops: List<Op>): Deferred<Boolean> {
    checkNotClosed()
    checkInDispatcher()
    log.verbose { "Applying operations: $ops" }

    // Let the store know about the op by piping it into our outgoing messages channel.
    val result = CompletableDeferred<Boolean>()
    sendMessageToStore(ProxyMessage.Operations(ops, null), result)
    return result
  }

  /*
   * In writeonly mode the database is the crdt actor. Any version map set here will be ignored by
   * the database, therefore we can just use an empty version map.
   */
  override fun getVersionMap(): VersionMap = VersionMap()

  override fun getParticleViewUnsafe(): T =
    throw UnsupportedOperationException("WriteOnlyStorageProxy cannot be read.")

  private fun checkNotClosed() = check(!isClosed()) {
    "Unexpected operation on closed StorageProxy"
  }

  private class HandleCallbackTask(
    callbackIdentifier: CallbackIdentifier,
    private val callbackName: String,
    block: () -> Unit
  ) : Scheduler.Task.Listener(
    callbackIdentifier.namespace,
    callbackIdentifier.handleName,
    block
  ) {
    override fun toString(): String = "$callbackName#${hashCode()}"
  }

  private suspend fun onMessage(message: ProxyMessage<Data, Op, T>) {
    throw UnsupportedOperationException("WriteOnlyStorageProxy received onMessage from Store")
  }

  companion object {
    suspend fun <Data : CrdtData, Op : CrdtOperation, T> create(
      storeOptions: StoreOptions,
      storageEndpointManager: StorageEndpointManager,
      scheduler: Scheduler
    ): WriteOnlyStorageProxyImpl<Data, Op, T> {
      /**
       * Since [storageEndpointManager.get] is a suspending method, we need to be in a
       * suspending context in order to attach its callback.
       */
      return WriteOnlyStorageProxyImpl<Data, Op, T>(storeOptions.storageKey, scheduler).also {
        it.store = storageEndpointManager.get(storeOptions, it::onMessage)
      }
    }
  }
}
