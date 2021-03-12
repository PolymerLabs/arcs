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
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtModelType
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.util.callbackManager
import arcs.core.util.Random
import arcs.core.util.TaggedLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * A write only [ActiveStore] capable of forwarding ops to a [Driver]. This store does not keep a
 * copy of the crdt model, and does not respond to sync requests or model updates.
 */
@Suppress("EXPERIMENTAL_API_USAGE")
class WriteOnlyDirectStore<Data : CrdtData, Op : CrdtOperation, T> /* internal */ constructor(
  options: StoreOptions,
  /** CoroutineScope for launching jobs. Currently only used to close the drive on [close]. */
  private val scope: CoroutineScope,
  private val driver: Driver<Data>,
  private val writeBack: WriteBack,
  private val devTools: DevToolsForDirectStore?
) : ActiveStore<Data, Op, T>(options) {

  private val log = TaggedLog { "WriteOnlyDirectStore" }

  /** True if this store has been closed. */
  private var closed = false

  private val callbackManager = callbackManager<ProxyMessage<Data, Op, T>>(
    "direct",
    Random
  )

  override suspend fun idle() {
    // TODO(b/172498981): figure out idle impl for stores.
  }

  // WriteOnlyDirectStore does never callback. We still generate a CallbackToken for the client to
  // satisfy the API, but the callback is never invoked, since write-only-stack do not need updates.
  override suspend fun on(callback: ProxyCallback<Data, Op, T>): CallbackToken {
    val callbackInvoke = callback::invoke
    synchronized(callbackManager) {
      return callbackManager.register(callbackInvoke)
    }
  }

  override suspend fun off(callbackToken: CallbackToken) {
    synchronized(callbackManager) {
      callbackManager.unregister(callbackToken)
    }
  }

  /** Closes the store. Once closed, it cannot be re-opened. A new instance must be created. */
  override fun close() {
    synchronized(callbackManager) {
      callbackManager.clear()
      closeInternal()
    }
  }

  private fun closeInternal() {
    if (!closed) {
      closed = true
      writeBack.close()
      /**
       * The [scope] was initialized and assigned at the [StorageService.onBind], hence
       * the [driver.close] would only take effect in real use-cases / integration tests
       * but unit tests which don't spin up entire storage service stack.
       */
      scope.launch { driver.close() }
    }
  }

  /**
   * Receives operations from connected storage proxies. SyncRequest and ModelUpdate are not
   * supported.
   */
  @Suppress("UNCHECKED_CAST")
  override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, T>) {
    log.verbose { "Received message: $message" }
    when (message) {
      is ProxyMessage.Operations -> {
        if (message.operations.isEmpty()) return
        writeBack.asyncFlush {
          driver.applyOps(message.operations)
        }
      }
      is ProxyMessage.SyncRequest -> {
        throw IllegalArgumentException("WriteOnlyDirectStore cannot handle SyncRequests.")
      }
      is ProxyMessage.ModelUpdate -> {
        throw IllegalArgumentException("WriteOnlyDirectStore cannot handle ModelUpdates.")
      }
    }.also {
      devTools?.onDirectStoreProxyMessage(proxyMessage = message as UntypedProxyMessage)
    }
  }

  companion object {

    @Suppress("UNCHECKED_CAST")
    suspend fun <Data : CrdtData, Op : CrdtOperation, T> create(
      options: StoreOptions,
      scope: CoroutineScope,
      driverFactory: DriverFactory,
      writeBackProvider: WriteBackProvider,
      devTools: DevToolsForStorage?
    ): WriteOnlyDirectStore<Data, Op, T> {
      val crdtType = requireNotNull(options.type as CrdtModelType<Data, Op, T>) {
        "Type not supported: ${options.type}"
      }

      val driver = CrdtException.requireNotNull(
        driverFactory.getDriver(
          options.storageKey,
          crdtType.crdtModelDataClass
        ) as? Driver<Data>
      ) { "No driver exists to support storage key ${options.storageKey}" }

      return WriteOnlyDirectStore(
        options,
        scope,
        writeBack = writeBackProvider(options.storageKey.protocol),
        driver = driver,
        devTools = devTools?.forDirectStore(options)
      )
    }
  }
}
