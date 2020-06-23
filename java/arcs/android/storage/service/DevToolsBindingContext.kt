package arcs.android.storage.service

import arcs.android.devtools.IDevToolsService
import arcs.android.storage.decodeProxyMessage
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.Store
import kotlin.coroutines.CoroutineContext

/**
 * A wrapper around the [BindingContext] to send updates to DevTools.
 */
class DevToolsBindingContext(
    /**
     * The [Store] this [BindingContext] provides bindings for, it may or may not be shared with
     * other instances of [BindingContext].
     */
    private val store: Store<*, *, *>,
    /** [CoroutineContext] on which to build one specific to this [BindingContext]. */
    parentCoroutineContext: CoroutineContext,
    /** Sink to use for recording statistics about accessing data. */
    private val bindingContextStatisticsSink: BindingContextStatisticsSink,
    private val devToolsService: IDevToolsService?,
    /** Callback to trigger when a proxy message has been received and sent to the store. */
    private val onProxyMessage: suspend (StorageKey, ProxyMessage<*, *, *>) -> Unit = { _, _ -> }
) : IStorageService.Stub() {

    val parentBinding =
        BindingContext(store, parentCoroutineContext, bindingContextStatisticsSink, onProxyMessage)

    override fun idle(timeoutMillis: Long, resultCallback: IResultCallback) =
        parentBinding.idle(timeoutMillis, resultCallback)

    @Suppress("UNCHECKED_CAST")
    override fun registerCallback(callback: IStorageServiceCallback) =
        parentBinding.registerCallback(callback)

    @Suppress("UNCHECKED_CAST")
    override fun sendProxyMessage(
        proxyMessage: ByteArray,
        resultCallback: IResultCallback
    ) {
        devToolsService?.send(proxyMessage.decodeProxyMessage().toString())
        parentBinding.sendProxyMessage(proxyMessage, resultCallback)
    }

    override fun unregisterCallback(token: Int) = parentBinding.unregisterCallback(token)
}
