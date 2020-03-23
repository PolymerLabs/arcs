package arcs.android.storage.service

import arcs.android.storage.ParcelableProxyMessage
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred

/**
 * Provides an object that can be provided to service calls as an [IStorageService.Stub],
 * and then waited on as a deferred. Useful when you want a single message response.
 */
interface DeferredProxyCallback : IStorageServiceCallback, Deferred<ParcelableProxyMessage>

private class CompletableProxyCallback(
    private val deferred: CompletableDeferred<ParcelableProxyMessage> = CompletableDeferred()
) : DeferredProxyCallback,
    IStorageServiceCallback.Stub(),
    Deferred<ParcelableProxyMessage> by deferred {
    override fun onProxyMessage(message: ParcelableProxyMessage) {
        deferred.complete(message)
    }
}

/** Helper method to provide a concrete implementation of [DeferredProxyCallback] */
fun DeferredProxyCallback(): DeferredProxyCallback = CompletableProxyCallback()
