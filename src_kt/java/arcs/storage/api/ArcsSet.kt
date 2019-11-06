package arcs.arcs.storage.api

import arcs.common.Referencable
import arcs.common.ReferenceId
import arcs.crdt.CrdtChange
import arcs.crdt.CrdtSet
import arcs.crdt.internal.Actor
import arcs.crdt.internal.VersionMap
import arcs.storage.ActiveStore
import arcs.storage.ProxyCallback
import arcs.storage.ProxyMessage
import arcs.storage.Store
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CompletableJob
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.BroadcastChannel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.coroutines.CoroutineContext

@ExperimentalCoroutinesApi
class ArcsSet<T : Referencable, StoreData : CrdtSet.Data<T>, StoreOp : CrdtSet.Operation<T>>(
    private val actor: Actor,
    private val store: Store<StoreData, StoreOp, Set<T>>,
    private val toStoreData: (CrdtSet.Data<T>) -> StoreData,
    private val toStoreOp: (CrdtSet.Operation<T>) -> StoreOp,
    coroutineContext: CoroutineContext
) : AbstractMutableSet<T>(), Referencable, AutoCloseable {
    override val id: ReferenceId = store.storageKey.toString()
    private val crdtMutex = Mutex()
    private val crdtSet = CrdtSet<T>()
    private val scope = CoroutineScope(coroutineContext)
    private val initialized: CompletableJob = Job(scope.coroutineContext[Job.Key])
    private var callbackId: Int = -1
    private val activated = CompletableDeferred<ActiveStore<StoreData, StoreOp, Set<T>>>(initialized)
    private val opChannel = BroadcastChannel<StoreOp>(OP_CHANNEL_CAPACITY)

    private val activeStore: ActiveStore<StoreData, StoreOp, Set<T>>
        get() {
            if (activated.isCompleted) return activated.getCompleted()
            return runBlocking(activated) { activated.await() }
        }

    init {
        scope.launch {
            val activeStore = store.activate()
            ProxyCallback<StoreData, StoreOp, Set<T>> { handleStoreCallback(it); true }
                .also { callbackId = activeStore.on(it) }
            activeStore.onProxyMessage(ProxyMessage.SyncRequest(callbackId))
            initialized.complete()
            activated.complete(activeStore)
        }
    }

    override fun iterator(): MutableIterator<T> {
        TODO()
    }

    fun suspendingIterator(): MutableIterator<T> {
        TODO("not implemented")
    }

    override fun add(element: T): Boolean {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }

    override fun remove(element: T): Boolean {
        return super.remove(element)
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun handleStoreCallback(message: ProxyMessage<StoreData, StoreOp, Set<T>>): Boolean {
        val messageBackToStore = crdtMutex.withLock {
            when (message) {
                is ProxyMessage.ModelUpdate -> handleModelUpdateMessage(message)
                is ProxyMessage.SyncRequest -> ProxyMessage.ModelUpdate(toStoreData(crdtSet.data), callbackId)
                is ProxyMessage.Operations -> handleOperationsMessage(message)
            }
        }
        return messageBackToStore?.let { activeStore.onProxyMessage(it) } ?: true
    }

    private fun handleModelUpdateMessage(
        message: ProxyMessage.ModelUpdate<StoreData, StoreOp, Set<T>>
    ): ProxyMessage<StoreData, StoreOp, Set<T>>? {
        val (_, otherChanges) = crdtSet.merge(message.model)
        return when (otherChanges) {
            is CrdtChange.Operations -> {
                if (otherChanges.ops.isNotEmpty() && otherChanges.ops.hasStoreSafeOps()) {
                    // We can send operations back to the activeStore.
                    ProxyMessage.Operations(otherChanges.ops.map(toStoreOp), callbackId)
                } else if (otherChanges.ops.isNotEmpty()) {
                    // otherChanges includes fast-forward ops, so let's just send a model update.
                    ProxyMessage.ModelUpdate(toStoreData(crdtSet.data), callbackId)
                } else null
            }
            is CrdtChange.Data -> {
                if (otherChanges.data != crdtSet.data) {
                    // If there should be changes sent to the activeStore, send 'em.
                    ProxyMessage.ModelUpdate(toStoreData(otherChanges.data), callbackId)
                } else null
            }
        }
    }

    private fun handleOperationsMessage(
        message: ProxyMessage.Operations<StoreData, StoreOp, Set<T>>
    ): ProxyMessage<StoreData, StoreOp, Set<T>>? {
        if (message.operations.none { !crdtSet.applyOperation(it) }) {
            return null
        }
        // Couldn't apply some operations, need to request a sync.
        return ProxyMessage.SyncRequest(callbackId)
    }

    override fun close() = runBlocking {
        if (initialized.isCompleted) {
            store.activate().off(callbackId)
        }
        scope.cancel("Closed owning ArcsSet")
        Unit
    }

    override val size: Int
        get() {
            while (!crdtMutex.tryLock()) { /* Wait */ }
            return crdtSet.consumerView.size.also { crdtMutex.unlock() }
        }

    class NonSuspendingIterator<T, StoreData, StoreOp> private constructor(
        private val parent: ArcsSet<T, StoreData, StoreOp>,
        private val removeChannel: BroadcastChannel<StoreOp>,
        private val version: VersionMap,
        private val backingIterator: Iterator<T>
    ): MutableIterator<T> where T : Referencable, StoreData : CrdtSet.Data<T>, StoreOp : CrdtSet.Operation<T> {
        private var current: T? = null

        override fun hasNext(): Boolean = backingIterator.hasNext()

        override fun next(): T = backingIterator.next().also { current = it }

        override fun remove() {
            val current = this.current ?: throw IllegalStateException("Cannot remove when iteration hasn't begun")
            version[parent.actor]++
            // While the removeChannel is full, keep trying to offer it a removal op.
            var waitSpins = 0
            while (waitSpins < MAX_WAIT_SPINS) {
                if (removeChannel.offer(parent.toStoreOp(CrdtSet.Operation.Remove(version, parent.actor, current)))) {
                    // If the channel wasn't full, we can break.
                    break
                }
                Thread.sleep(5) // TODO: good idea/bad idea?
                waitSpins++
            }
        }
    }

    class SuspendingIterator<T, StoreData, StoreOp>(
        private val parent: ArcsSet<T, StoreData, StoreOp>,
        private val removeChannel: BroadcastChannel<StoreOp>,
        private val crdtSet: CrdtSet<T>
    ) : AutoCloseable where T : Referencable, StoreData : CrdtSet.Data<T>, StoreOp : CrdtSet.Operation<T> {
        private val mutex = Mutex()
        private var backingIterator: Iterator<T>
        private var callbackId: Int = -1
        private var current: T? = null

        init {
            backingIterator = crdtSet.consumerView.iterator()
            callbackId = parent.activeStore.on(ProxyCallback {
                if (it is ProxyMessage.ModelUpdate) {
                    mutex.withLock {
                        crdtSet.merge(it.model)
                        backingIterator = crdtSet.consumerView.iterator()
                    }
                }
                true
            })
        }

        fun hasNext(): Boolean = backingIterator.hasNext()

        fun next(): T = backingIterator.next().also { current = it }

        suspend fun remove() {
            val current = this.current ?: throw IllegalStateException("Cannot remove when iteration hasn't begun")
            val version = crdtSet.data.versionMap
            version[parent.actor]++
            removeChannel.send(parent.toStoreOp(CrdtSet.Operation.Remove(version, parent.actor, current)))
        }

        internal suspend fun sync() {
            check(current == null) { "Syncs may only be performed before iteration has begun" }
            parent.activeStore.onProxyMessage(ProxyMessage.SyncRequest(callbackId))
        }

        override fun close() {
            parent.activeStore.off(callbackId)
        }
    }

    private fun Collection<CrdtSet.Operation<T>>.hasStoreSafeOps(): Boolean =
        none { it is CrdtSet.Operation.FastForward }

    companion object {
        private const val MAX_WAIT_SPINS = 100
        private const val OP_CHANNEL_CAPACITY = 100
    }
}