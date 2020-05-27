package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.coroutines.Continuation
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

/** [StoreEndpointFake] exists to capture calls made to [Store] for unit tests. This is needed
 * because Google3's Mockito is incompatible with suspend functions.
 */
class StoreEndpointFake<Data : CrdtData, Op : CrdtOperation, T> :
    StorageCommunicationEndpoint<Data, Op, T> {
    private val mutex = Mutex()
    private var proxyMessages = mutableListOf<ProxyMessage<Data, Op, T>>()
    var closed = false
    private var targetMessages: List<ProxyMessage<Data, Op, T>> = emptyList()
    private var targetContinuation: Continuation<Unit>? = null

    // Tests can change this field to alter the value returned by `onProxyMessage`.
    var onProxyMessageReturn = true

    override suspend fun idle() = Unit

    override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, T>): Boolean {
        val found = mutex.withLock {
            proxyMessages.add(message)
            proxyMessages == targetMessages
        }
        if (found) {
            targetContinuation?.resume(Unit)
        }
        return onProxyMessageReturn
    }

    suspend fun getProxyMessages() : List<ProxyMessage<Data, Op, T>> {
        mutex.withLock { return proxyMessages.toList() }
    }

    suspend fun clearProxyMessages() {
        mutex.withLock { proxyMessages.clear() }
    }

    suspend fun waitFor(vararg messages: ProxyMessage<Data, Op, T>) = suspendCoroutine<Unit> {
        targetContinuation = null
        targetMessages = emptyList()
        if (proxyMessages == messages.toList()) {
            it.resume(Unit)
        } else {
            targetMessages = messages.toList()
            targetContinuation = it
        }
    }

    override fun close() {
        closed = true
    }
}
