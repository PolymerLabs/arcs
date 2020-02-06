package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import kotlinx.atomicfu.locks.ReentrantLock
import kotlinx.atomicfu.locks.withLock

/** [StoreEndpointFake] exists to capture calls made to [Store] for unit tests. This is needed
 * because Google3's Mockito is incompatible with suspend functions.
 */
class StoreEndpointFake<Data : CrdtData, Op : CrdtOperation, T> : StorageCommunicationEndpoint<Data, Op, T> {
    private val mutex = ReentrantLock()
    private var callbacks = mutableListOf<ProxyCallback<Data, Op, T>>()
    private var proxyMessages = mutableListOf<ProxyMessage<Data, Op, T>>()

    override fun setCallback(callback: ProxyCallback<Data, Op, T>) {
        mutex.withLock { callbacks.add(callback) }
    }

    suspend fun getCallbacks(): List<ProxyCallback<Data, Op, T>> {
        mutex.withLock { return callbacks.toList() }
    }

    override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, T>): Boolean {
        mutex.withLock { proxyMessages.add(message) }
        return true
    }

    fun getProxyMessages() : List<ProxyMessage<Data, Op, T>> {
        mutex.withLock { return proxyMessages.toList() }
    }
}
