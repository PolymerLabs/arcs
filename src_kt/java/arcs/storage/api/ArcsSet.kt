package arcs.arcs.storage.api

import arcs.arcs.util.Log
import arcs.common.Referencable
import arcs.common.ReferenceId
import arcs.crdt.CrdtChange
import arcs.crdt.CrdtSet
import arcs.crdt.internal.Actor
import arcs.crdt.internal.VersionMap
import arcs.data.CollectionType
import arcs.data.CountType
import arcs.data.EntityType
import arcs.data.RawEntity
import arcs.data.Schema
import arcs.data.util.ReferencablePrimitive
import arcs.storage.ActiveStore
import arcs.storage.ExistenceCriteria
import arcs.storage.ProxyCallback
import arcs.storage.ProxyMessage
import arcs.storage.StorageKey
import arcs.storage.StorageMode
import arcs.storage.Store
import arcs.storage.StoreOptions
import arcs.storage.referencemode.RefModeStoreData
import arcs.storage.referencemode.RefModeStoreOp
import arcs.storage.referencemode.ReferenceModeStorageKey
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CompletableJob
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.BroadcastChannel
import kotlinx.coroutines.channels.consume
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.coroutines.CoroutineContext

@ExperimentalCoroutinesApi
class ArcsSet<T : Referencable, StoreData : CrdtSet.Data<T>, StoreOp : CrdtSet.IOperation<T>>(
    private val store: Store<StoreData, StoreOp, Set<T>>,
    private val toStoreData: (CrdtSet.Data<T>) -> StoreData,
    private val toStoreOp: (CrdtSet.IOperation<T>) -> StoreOp,
    coroutineContext: CoroutineContext
) : Referencable, AutoCloseable {
    override val id: ReferenceId = store.storageKey.toString()
    private val crdtMutex = Mutex()
    private val crdtSet = CrdtSet<T>()
    private val scope = CoroutineScope(coroutineContext)
    private val initialized: CompletableJob = Job(scope.coroutineContext[Job.Key])
    private var callbackId: Int = -1
    private val activated = CompletableDeferred<ActiveStore<StoreData, StoreOp, Set<T>>>(initialized)
    private val opChannel = BroadcastChannel<StoreOp>(OP_CHANNEL_CAPACITY)
    val actor: Actor = "ArcsSet@${hashCode()}"

    private val activeStore: ActiveStore<StoreData, StoreOp, Set<T>>
        get() {
            if (activated.isCompleted) return activated.getCompleted()
            return runBlocking(activated) { activated.await() }
        }

    init {
        scope.launch {
            val activeStore = store.activate()
            initialized.complete()
            ProxyCallback<StoreData, StoreOp, Set<T>> { handleStoreCallback(it); true }
                .also { callbackId = activeStore.on(it) }
            activated.complete(activeStore)
            activeStore.onProxyMessage(ProxyMessage.SyncRequest(callbackId))

            opChannel.openSubscription().consume {
                while (!isClosedForReceive) {
                    val op = receive()
                    Log.debug { "$actor sending op to activeStore: $op" }
                    activeStore.onProxyMessage(ProxyMessage.Operations(listOf(op), callbackId))
                }
            }
        }
    }

    suspend fun iterator(): SuspendingIterator<T, StoreData, StoreOp> {
        activated.await()
        return SuspendingIterator(this, opChannel, crdtMutex.withLock { CrdtSet(crdtSet.data) } )
    }

    suspend fun addAsync(element: T, coroutineScope: CoroutineScope = scope): Deferred<Boolean> {
        activated.await()

        val (success, op) = crdtMutex.withLock {
            crdtSet.data.versionMap.copy().let {
                it[actor]++
                val op = CrdtSet.Operation.Add(it, actor, element)
                crdtSet.applyOperation(op) to op
            }
        }
        return if (success) coroutineScope.async { applyOperationToStore(op) } else CompletableDeferred(false)
    }

    suspend fun removeAsync(element: T, coroutineScope: CoroutineScope = scope): Deferred<Boolean> {
        activated.await()

        val (success, op) = crdtMutex.withLock {
            crdtSet.data.versionMap.copy().let {
                it[actor]++
                val op = CrdtSet.Operation.Remove(it, actor, element)
                crdtSet.applyOperation(op) to op
            }
        }
        return if (success) coroutineScope.async { applyOperationToStore(op) } else CompletableDeferred(false)
    }

    private suspend fun applyOperationToStore(op: CrdtSet.Operation<T>): Boolean =
        activeStore.onProxyMessage(ProxyMessage.Operations(listOf(toStoreOp(op)), callbackId))

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

    override fun close() = runBlocking(scope.coroutineContext) {
        if (initialized.isCompleted) {
            store.activate().off(callbackId)
        }
        scope.cancel()
        Unit
    }

    val size: Int
        get() {
            while (!crdtMutex.tryLock()) { /* Wait */ }
            return crdtSet.consumerView.size.also { crdtMutex.unlock() }
        }

    operator fun contains(item: T): Boolean = runBlocking(scope.coroutineContext) {
        activated.await()

        crdtMutex.withLock {
            crdtSet.consumerView.any { it.tryDereference() == item }
        }
    }

    class SuspendingIterator<T, StoreData, StoreOp> internal constructor(
        private val parent: ArcsSet<T, StoreData, StoreOp>,
        private val removeChannel: BroadcastChannel<StoreOp>,
        private val crdtSet: CrdtSet<T>
    ) : AutoCloseable where T : Referencable, StoreData : CrdtSet.Data<T>, StoreOp : CrdtSet.IOperation<T> {
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

    private fun Collection<CrdtSet.IOperation<T>>.hasStoreSafeOps(): Boolean =
        none { it is CrdtSet.Operation.FastForward }

    companion object {
        private const val MAX_WAIT_SPINS = 100
        private const val OP_CHANNEL_CAPACITY = 100
    }
}

@ExperimentalCoroutinesApi
fun ArcsSet(
    storageKey: ReferenceModeStorageKey,
    schema: Schema,
    existenceCriteria: ExistenceCriteria = ExistenceCriteria.MayExist,
    coroutineContext: CoroutineContext = Dispatchers.IO
): ArcsSet<RawEntity, RefModeStoreData.Set, RefModeStoreOp.Set> {
    val storeOpts = StoreOptions<RefModeStoreData.Set, RefModeStoreOp.Set, Set<RawEntity>>(
        storageKey = storageKey,
        type = CollectionType(EntityType(schema)),
        existenceCriteria = existenceCriteria,
        mode = StorageMode.ReferenceMode
    )
    return ArcsSet(
        store = Store(storeOpts),
        toStoreData = { RefModeStoreData.Set(it) },
        toStoreOp = {
            when (it) {
                is CrdtSet.Operation.Add -> RefModeStoreOp.SetAdd(it)
                is CrdtSet.Operation.Remove -> RefModeStoreOp.SetRemove(it)
                else -> throw IllegalArgumentException("Invalid operation type: $it")
            }
        },
        coroutineContext = coroutineContext
    )
}

@ExperimentalCoroutinesApi
inline fun <reified T> ArcsSet(
    storageKey: StorageKey,
    existenceCriteria: ExistenceCriteria = ExistenceCriteria.MayExist,
    coroutineContext: CoroutineContext = Dispatchers.IO
): ArcsSet<ReferencablePrimitive<T>,
    CrdtSet.Data<ReferencablePrimitive<T>>,
    CrdtSet.IOperation<ReferencablePrimitive<T>>> {

    require(ReferencablePrimitive.isSupportedPrimitive(T::class)) { "Unsupported type: ${T::class.java}" }

    val storeOps = StoreOptions<
        CrdtSet.Data<ReferencablePrimitive<T>>,
        CrdtSet.IOperation<ReferencablePrimitive<T>>,
        Set<ReferencablePrimitive<T>>>(
        storageKey = storageKey,
        type = CollectionType(CountType()), // TODO: this is wrong. There should probably be a PrimitiveType?
        existenceCriteria = existenceCriteria,
        mode = StorageMode.Direct
    )
    return ArcsSet(
        store = Store(storeOps),
        toStoreData = { it },
        toStoreOp = { it },
        coroutineContext = coroutineContext
    )
}
