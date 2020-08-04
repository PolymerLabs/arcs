package arcs.android.storage.service

import arcs.android.storage.decodeProxyMessage
import arcs.android.storage.toProto
import arcs.core.storage.ProxyMessage
import arcs.core.util.TaggedLog

class DevToolsProxyImpl : IDevToolsProxy.Stub() {
    private val log = TaggedLog { "DevToolsProxy" }
    private val onBindingContextProxyMessageCallbacks = mutableSetOf<IStorageServiceCallback>()

    override fun onBindingContextProxyMessage(proxyMessage: ByteArray) {
        val actualMessage = proxyMessage.decodeProxyMessage()
        log.debug { "KOALA: [${actualMessage}]" }

        onBindingContextProxyMessageCallbacks.forEach { callback ->
            callback.onProxyMessage(proxyMessage)
        }
    }

    override fun registerBindingContextProxyMessageCallback(callback: IStorageServiceCallback) {
        onBindingContextProxyMessageCallbacks.add(callback)
    }
}
