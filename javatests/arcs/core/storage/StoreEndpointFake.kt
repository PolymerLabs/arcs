package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.util.TaggedLog
import kotlinx.coroutines.CompletableJob
import kotlinx.coroutines.Job
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * [StoreEndpointFake] exists to capture calls made to [Store] for unit tests. This is needed
 * because Google3's Mockito is incompatible with suspend functions.
 */
@Suppress("EXPERIMENTAL_API_USAGE")
class StoreEndpointFake<Data : CrdtData, Op : CrdtOperation, T> :
    StorageCommunicationEndpoint<Data, Op, T> {
    private val log = TaggedLog { "StoreEndpointFake" }
    private var proxyMessages = emptyList<ProxyMessage<Data, Op, T>>()
    private val targetMutex = Mutex()
    private var target: Target<Data, Op, T>? = null
    var closed = false

    // Tests can change this field to alter the value returned by `onProxyMessage`.
    var onProxyMessageReturn = true

    override suspend fun idle() = Unit

    override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, T>): Boolean {
        targetMutex.withLock {
            proxyMessages = proxyMessages + message
            log.info { "onProxyMessage($message) - current value: $proxyMessages" }

            val target = this.target ?: return@withLock
            if (target.messages.endsWith(proxyMessages)) {
                target.job.complete()
            }
        }

        return onProxyMessageReturn
    }

    suspend fun getProxyMessages(): List<ProxyMessage<Data, Op, T>> = targetMutex.withLock {
        proxyMessages
    }

    suspend fun clearProxyMessages() = targetMutex.withLock {
        log.info { "clearProxyMessages()" }
        proxyMessages = emptyList()
    }

    suspend fun waitFor(vararg messages: ProxyMessage<Data, Op, T>) {
        targetMutex.withLock {
            val messageList = messages.toList()
            if (proxyMessages.endsWith(messageList)) {
                log.info {
                    "waitFor($messageList) - found a match in current value: $proxyMessages"
                }
                return@withLock Job().also { it.complete() }
            }
            val job = Job()
            log.info {
                "waitFor($messageList) - waiting for a match, current value: $proxyMessages"
            }
            target = Target(messageList, job)
            job
        }.join()
    }

    override suspend fun close() {
        closed = true
    }

    private data class Target<Data : CrdtData, Op : CrdtOperation, T>(
        val messages: List<ProxyMessage<Data, Op, T>>,
        val job: CompletableJob
    )

    private fun <T : Any> List<T>?.endsWith(other: List<T>): Boolean {
        if (this == null) return other.isEmpty()
        if (size < other.size) return false

        val tail = subList(size - other.size, size)
        return tail == other
    }
}
