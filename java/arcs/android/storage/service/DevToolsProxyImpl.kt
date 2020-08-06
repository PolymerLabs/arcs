package arcs.android.storage.service

/**
 * Implementation of [IDevToolsProxy] to allow communication between the [StorageService] and
 * [DevToolsService]
 */
class DevToolsProxyImpl : IDevToolsProxy.Stub() {
    private val onBindingContextProxyMessageCallbacks = mutableMapOf<Int, IStorageServiceCallback>()
    private var bindingContextCallbackCounter = 0

    /**
     * TODO: (sarahheimlich) remove once we dive into stores (b/162955831)
     *
     * Execute the callbacks to be called with the [BindingContext] receives a [ProxyMessage]
     */
    fun onBindingContextProxyMessage(proxyMessage: ByteArray) {
        onBindingContextProxyMessageCallbacks.forEach { key, callback ->
            callback.onProxyMessage(proxyMessage)
        }
    }

    override fun registerBindingContextProxyMessageCallback(
        callback: IStorageServiceCallback
    ): Int {
        bindingContextCallbackCounter++
        onBindingContextProxyMessageCallbacks.put(bindingContextCallbackCounter, callback)
        return bindingContextCallbackCounter
    }

    override fun deRegisterBindingContextProxyMessageCallback(callbackToken: Int) {
        onBindingContextProxyMessageCallbacks.remove(callbackToken)
    }
}
