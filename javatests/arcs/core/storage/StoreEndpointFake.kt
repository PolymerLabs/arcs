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
    private var callbacks = mutableListOf<ProxyCallback<Data, Op, T>>()
    private var proxyMessages = mutableListOf<ProxyMessage<Data, Op, T>>()

    // Tests can change this field to alter the value returned by `onProxyMessage`.
    var onProxyMessageReturn = true

    override fun setCallback(callback: ProxyCallback<Data, Op, T>): Int {
        // must be blocking since the storage impl is. Unlikely to be heavily contended.
        return runBlocking {
            mutex.withLock {
                callbacks.add(callback)
                callbacks.size
            }
        }
    }

    suspend fun getCallbacks(): List<ProxyCallback<Data, Op, T>> {
        mutex.withLock { return callbacks.toList() }
    }

    override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, T>): Boolean {
        mutex.withLock { proxyMessages.add(message) }
        return onProxyMessageReturn
    }

    suspend fun getProxyMessages() : List<ProxyMessage<Data, Op, T>> {
        mutex.withLock { return proxyMessages.toList() }
    }
}
