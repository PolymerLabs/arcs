package arcs.android.storage.service

import arcs.android.storage.toProto
import arcs.core.storage.DevToolsProxy
import arcs.core.storage.ProxyMessage

/**
 * Implementation of [IDevToolsProxy] to allow communication between the [StorageService] and
 * [DevToolsService]
 */
class DevToolsProxyImpl : IDevToolsProxy.Stub(), DevToolsProxy {
    private val onRefModeStoreProxyMessageCallbacks = mutableMapOf<Int, IStorageServiceCallback>()
    private var refModeStoreCallbackCounter = 0

    private val onDirectStoreProxyMessageCallbacks = mutableMapOf<Int, IStorageServiceCallback>()
    private var directStoreCallbackCounter = 0

    /**
     * Execute the callbacks to be called when the [ReferenceModeStore] receives a [ProxyMessage]
     */
    override fun onRefModeStoreProxyMessage(proxyMessage: ProxyMessage<*, *, *>) {
        onRefModeStoreProxyMessageCallbacks.forEach { (_, callback) ->
            callback.onProxyMessage(proxyMessage.toProto().toByteArray())
        }
    }

    /**
     * Execute the callbacks to be called when the [DirectStore] receives a [ProxyMessage]
     */
    override fun onDirectStoreProxyMessage(proxyMessage: ProxyMessage<*, *, *>) {
        onDirectStoreProxyMessageCallbacks.forEach { (_, callback) ->
            callback.onProxyMessage(proxyMessage.toProto().toByteArray())
        }
    }

    override fun registerRefModeStoreProxyMessageCallback(
        callback: IStorageServiceCallback
    ): Int {
        refModeStoreCallbackCounter++
        onRefModeStoreProxyMessageCallbacks.put(refModeStoreCallbackCounter, callback)
        return refModeStoreCallbackCounter
    }

    override fun registerDirectStoreProxyMessageCallback(
        callback: IStorageServiceCallback
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
}
