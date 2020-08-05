package arcs.android.storage.service

/**
 * Implementation of [IDevToolsProxy] to allow communication between the [StorageService] and
 * [DevToolsService]
 */
class DevToolsProxyImpl : IDevToolsProxy.Stub() {
    private val onBindingContextProxyMessageCallbacks = mutableSetOf<IStorageServiceCallback>()

    /**
     * TODO: (sarahheimlich) remove once we dive into stores (b/162955831)
     *
     * Execute the callbacks to be called with the [BindingContext] receives a [ProxyMessage]
     */
    fun onBindingContextProxyMessage(proxyMessage: ByteArray) {
        onBindingContextProxyMessageCallbacks.forEach { callback ->
            callback.onProxyMessage(proxyMessage)
        }
    }

    override fun registerBindingContextProxyMessageCallback(callback: IStorageServiceCallback) {
        onBindingContextProxyMessageCallbacks.add(callback)
    }

    override fun deRegisterBindingContextProxyMessageCallback(callback: IStorageServiceCallback) {
        onBindingContextProxyMessageCallbacks.remove(callback)
    }
}
