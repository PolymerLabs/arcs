package arcs.android.storage.service

import arcs.core.storage.ProxyMessage


interface DevToolsProxy {

    fun onBindingContextProxyMessage(proxyMessage: ProxyMessage<*, *, *>)

    fun registerBindingContextProxyMessageCallback(
        callback: (ProxyMessage<*, *, *>) -> Unit
    )
}
