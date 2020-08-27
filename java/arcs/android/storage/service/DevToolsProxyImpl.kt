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

    /**
     * TODO: (sarahheimlich) remove once we dive into stores (b/162955831)
     *
     * Execute the callbacks to be called with the [BindingContext] receives a [ProxyMessage]
     */
    override fun onRefModeStoreProxyMessage(proxyMessage: ProxyMessage<*, *, *>) {
        onRefModeStoreProxyMessageCallbacks.forEach { (_, callback) ->
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

    override fun deRegisterRefModeStoreProxyMessageCallback(callbackToken: Int) {
        onRefModeStoreProxyMessageCallbacks.remove(callbackToken)
    }
}
