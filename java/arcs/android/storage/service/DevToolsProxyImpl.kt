package arcs.android.storage.service

import arcs.android.storage.toProto
import arcs.core.storage.DevToolsForDirectStore
import arcs.core.storage.DevToolsForRefModeStore
import arcs.core.storage.DevToolsForStorage
import arcs.core.storage.DirectStore
import arcs.core.storage.ProxyMessage
import arcs.core.storage.ReferenceModeStore
import arcs.core.storage.StoreOptions

/**
 * Implementation of [IDevToolsProxy] to allow communication between the [StorageService] and
 * [DevToolsService]
 */
class DevToolsProxyImpl : IDevToolsProxy.Stub(), DevToolsForStorage {
  private val onRefModeStoreProxyMessageCallbacks = mutableMapOf<Int, IDevToolsProxyCallback>()
  private var refModeStoreCallbackCounter = 0

  private val onDirectStoreProxyMessageCallbacks = mutableMapOf<Int, IDevToolsProxyCallback>()
  private var directStoreCallbackCounter = 0

  /**
   * Execute the callbacks to be called when the [ReferenceModeStore] receives a [ProxyMessage]
   */
  fun onRefModeStoreProxyMessage(proxyMessage: ProxyMessage<*, *, *>, options: StoreOptions) {
    onRefModeStoreProxyMessageCallbacks.forEach { (_, callback) ->
      callback.onProxyMessage(proxyMessage.toProto().toByteArray(), options.storageKey.toString())
    }
  }

  /**
   * Execute the callbacks to be called when the [DirectStore] receives a [ProxyMessage]
   */
  fun onDirectStoreProxyMessage(proxyMessage: ProxyMessage<*, *, *>, options: StoreOptions) {
    onDirectStoreProxyMessageCallbacks.forEach { (_, callback) ->
      callback.onProxyMessage(proxyMessage.toProto().toByteArray(), options.storageKey.toString())
    }
  }

  override fun registerRefModeStoreProxyMessageCallback(
    callback: IDevToolsProxyCallback
  ): Int {
    refModeStoreCallbackCounter++
    onRefModeStoreProxyMessageCallbacks.put(refModeStoreCallbackCounter, callback)
    return refModeStoreCallbackCounter
  }

  override fun registerDirectStoreProxyMessageCallback(
    callback: IDevToolsProxyCallback
  ): Int {
    directStoreCallbackCounter++
    onDirectStoreProxyMessageCallbacks.put(directStoreCallbackCounter, callback)
    return directStoreCallbackCounter
  }

  override fun deRegisterRefModeStoreProxyMessageCallback(callbackToken: Int) {
    onRefModeStoreProxyMessageCallbacks.remove(callbackToken)
  }

  override fun deRegisterDirectStoreProxyMessageCallback(callbackToken: Int) {
    onDirectStoreProxyMessageCallbacks.remove(callbackToken)
  }

  override fun forDirectStore(options: StoreOptions) = DevToolsForDirectStoreImpl(this, options)
  override fun forRefModeStore(options: StoreOptions) = DevToolsForRefModeStoreImpl(this, options)
}

/**
 * Shared superclass for objects exposing relevant slices of the DevTools API.
 */
sealed class DevToolsForStorageImpl(val proxy: DevToolsProxyImpl) : DevToolsForStorage {
  override fun forDirectStore(options: StoreOptions) = DevToolsForDirectStoreImpl(proxy, options)
  override fun forRefModeStore(options: StoreOptions) = DevToolsForRefModeStoreImpl(proxy, options)
}

/** Exposes a slice of the DevTools API for [DirectStore]s. */
class DevToolsForDirectStoreImpl(
  proxy: DevToolsProxyImpl,
  val options: StoreOptions
) : DevToolsForStorageImpl(proxy), DevToolsForDirectStore {
  override fun onDirectStoreProxyMessage(proxyMessage: ProxyMessage<*, *, *>) =
    proxy.onDirectStoreProxyMessage(proxyMessage, options)
}

/** Exposes a slice of the DevTools API for [ReferenceModeStore]s. */
class DevToolsForRefModeStoreImpl(
  proxy: DevToolsProxyImpl,
  val options: StoreOptions
) : DevToolsForStorageImpl(proxy), DevToolsForRefModeStore {
  override fun onRefModeStoreProxyMessage(proxyMessage: ProxyMessage<*, *, *>) =
    proxy.onRefModeStoreProxyMessage(proxyMessage, options)
}
