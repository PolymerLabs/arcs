package arcs.android.storage.service

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred

/**
 * Provides an object that can be provided to service calls as an [IStorageService.Stub],
 * and then waited on as a deferred. Useful when you want a single message response.
 *
 * @param deferred resolves to a [ProxyMessageProto] serialized as a [ByteArray]
 */
interface DeferredProxyCallback : IStorageServiceCallback, Deferred<ByteArray>

private class CompletableProxyCallback(
    private val deferred: CompletableDeferred<ByteArray> = CompletableDeferred()
) : DeferredProxyCallback,
    IStorageServiceCallback.Stub(),
    Deferred<ByteArray> by deferred {
    override fun onProxyMessage(proxyMessage: ByteArray) {
        deferred.complete(proxyMessage)
    }
}

/** Helper method to provide a concrete implementation of [DeferredProxyCallback] */
fun DeferredProxyCallback(): DeferredProxyCallback = CompletableProxyCallback()
