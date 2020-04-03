package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** [StoreEndpointFake] exists to capture calls made to [Store] for unit tests. This is needed
 * because Google3's Mockito is incompatible with suspend functions.
 */
class StoreEndpointFake<Data : CrdtData, Op : CrdtOperation, T> :
    StorageCommunicationEndpoint<Data, Op, T> {
    private val mutex = Mutex()
    private var proxyMessages = mutableListOf<ProxyMessage<Data, Op, T>>()

    // Tests can change this field to alter the value returned by `onProxyMessage`.
    var onProxyMessageReturn = true

    override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, T>): Boolean {
        mutex.withLock { proxyMessages.add(message) }
        return onProxyMessageReturn
    }

    suspend fun getProxyMessages() : List<ProxyMessage<Data, Op, T>> {
        mutex.withLock { return proxyMessages.toList() }
    }

    suspend fun clearProxyMessages() {
        mutex.withLock { proxyMessages.clear() }
    }

    override fun close() {}
}
