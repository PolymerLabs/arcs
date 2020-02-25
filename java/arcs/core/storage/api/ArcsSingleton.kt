package arcs.core.storage.api

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.Actor
import arcs.core.crdt.CrdtChange
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.storage.ActivationFactory
import arcs.core.storage.ActiveStore
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageMode
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.TaggedLog
import arcs.core.util.guardedBy
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CompletableJob
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Creates an [ArcsSingleton] which manages a reference to a [RawEntity] object located at the given
 * [storageKey], whose schema is defined by the supplied [schema].
 *
 * **Note:** By supplying your [coroutineContext], any bindings to the storage layer are released
 * when the context's primary job is completed, thus avoiding a memory leak.
 */
@Suppress("FunctionName")
@ExperimentalCoroutinesApi
fun ArcsSingleton(
    storageKey: ReferenceModeStorageKey,
    schema: Schema,
    existenceCriteria: ExistenceCriteria = ExistenceCriteria.MayExist,
    coroutineContext: CoroutineContext = Dispatchers.Default,
    /* ktlint-disable max-line-length */
    activationFactory: ActivationFactory<RefModeStoreData.Singleton, RefModeStoreOp.Singleton, RawEntity>? = null
    /* ktlint-enable max-line-length */
): ArcsSingleton<RawEntity, RefModeStoreData.Singleton, RefModeStoreOp.Singleton> {
    val storeOpts = StoreOptions<RefModeStoreData.Singleton, RefModeStoreOp.Singleton, RawEntity>(
        storageKey = storageKey,
        type = SingletonType(EntityType(schema)),
        existenceCriteria = existenceCriteria,
        mode = StorageMode.ReferenceMode
    )
    return ArcsSingleton(
        store = Store(storeOpts),
        toStoreData = { RefModeStoreData.Singleton(it) },
        toStoreOp = {
            when (it) {
                is CrdtSingleton.Operation.Update -> RefModeStoreOp.SingletonUpdate(it)
                is CrdtSingleton.Operation.Clear -> RefModeStoreOp.SingletonClear(it)
                else -> throw IllegalArgumentException("Invalid operation type: $it")
            }
        },
        coroutineContext = coroutineContext,
        activationFactory = activationFactory
    )
}

/**
 * Creates an [ArcsSingleton] which manages a reference to a [ReferencablePrimitive] object of
 * type <T> located at the given [storageKey].
 *
 * **Note:** By supplying your [coroutineContext], any bindings to the storage layer are released
 * when the context's primary job is completed, thus avoiding a memory leak.
 */
@Suppress("FunctionName")
@ExperimentalCoroutinesApi
inline fun <reified T> ArcsSingleton(
    storageKey: StorageKey,
    existenceCriteria: ExistenceCriteria = ExistenceCriteria.MayExist,
    coroutineContext: CoroutineContext = Dispatchers.Default,
    /* ktlint-disable max-line-length */
    activationFactory: ActivationFactory<CrdtSingleton.Data<ReferencablePrimitive<T>>, CrdtSingleton.IOperation<ReferencablePrimitive<T>>, ReferencablePrimitive<T>>? = null
    /* ktlint-enable max-line-length */
): ArcsSingleton<ReferencablePrimitive<T>,
    CrdtSingleton.Data<ReferencablePrimitive<T>>,
    CrdtSingleton.IOperation<ReferencablePrimitive<T>>> {

    require(ReferencablePrimitive.isSupportedPrimitive(T::class)) {
        "Unsupported type: ${T::class}"
    }

    val storeOps = StoreOptions<
        CrdtSingleton.Data<ReferencablePrimitive<T>>,
        CrdtSingleton.IOperation<ReferencablePrimitive<T>>,
        ReferencablePrimitive<T>>(
        storageKey = storageKey,
        // TODO: this is wrong. There should probably be a PrimitiveType?
        type = SingletonType(CountType()),
        existenceCriteria = existenceCriteria,
        mode = StorageMode.Direct
    )
    return ArcsSingleton(
        store = Store(storeOps),
        toStoreData = { it },
        toStoreOp = { it },
        coroutineContext = coroutineContext,
        activationFactory = activationFactory
    )
}

/**
 * [ArcsSingleton] is a register-like data structure which allows for easy interaction with
 * [CrdtSingleton]s managed by Arcs' storage layer.
 *
 * All functions on [ArcsSingleton] are suspending functions, due to the fact that communicating
 * with the storage layer is an inherently asynchronous process.
 *
 * **Note:** By supplying your [CoroutineContext] to the constructor, any bindings to the storage
 * layer are released when the context's primary job is completed, thus avoiding a memory leak.
 */
class ArcsSingleton<T, StoreData, StoreOp>(
    private val store: Store<StoreData, StoreOp, T>,
    private val toStoreData: (CrdtSingleton.Data<T>) -> StoreData,
    private val toStoreOp: (CrdtSingleton.IOperation<T>) -> StoreOp,
    coroutineContext: CoroutineContext,
    activationFactory: ActivationFactory<StoreData, StoreOp, T>? = null
) : Referencable
    where T : Referencable,
          StoreData : CrdtSingleton.Data<T>,
          StoreOp : CrdtSingleton.IOperation<T> {

    override val id: ReferenceId = store.storageKey.toKeyString()

    /**
     * The [Actor] this instance will use when performing Crdt operations on the underlying data.
     */
    val actor: Actor by lazy { "ArcsSingleton@${hashCode()}" }

    private val scope = CoroutineScope(coroutineContext)
    private val crdtMutex = Mutex()
    private val crdtSingleton by guardedBy(crdtMutex, CrdtSingleton<T>())
    private var cachedVersion by guardedBy(crdtMutex, VersionMap())
    @Suppress("RemoveExplicitTypeArguments")
    private var cachedConsumerData: T? by guardedBy<T?>(crdtMutex, null)
    private val initialized: CompletableJob = Job(scope.coroutineContext[Job])
    @Suppress("RemoveExplicitTypeArguments")
    private var syncJob: CompletableJob? by guardedBy<CompletableJob?>(crdtMutex, null)
    private var callbackId: Int = -1
    private val activated =
        CompletableDeferred<ActiveStore<StoreData, StoreOp, T>>(initialized)
    private val log = TaggedLog { "$actor(locked=${crdtMutex.isLocked})" }

    init {
        var activeStore: ActiveStore<StoreData, StoreOp, T>? = null

        // Launch a coroutine to activate the backing store, register ourselves as a ProxyCallback,
        // and perform an initial sync.
        scope.launch {
            activeStore = store.activate(activationFactory).also { activeStore ->
                initialized.complete()
                ProxyCallback<StoreData, StoreOp, T> { handleStoreCallback(it) }
                    .also {
                        callbackId = activeStore.on(it)
                        log.debug { "Callback Id: $callbackId" }
                    }
                activated.complete(activeStore)
                sync().join()
            }
        }

        // When the owning scope is finished, we should clean up after ourselves.
        scope.coroutineContext[Job.Key]?.invokeOnCompletion { activeStore?.off(callbackId) }
    }

    /** Gets the current value (if any). */
    suspend fun fetch(): T? {
        activated.await()
        return crdtMutex.withLock {
            syncJob?.join() // If there's an ongoing sync, let it finish.
            cachedConsumerData
        }
    }

    /**
     * Launches a coroutine to asynchronously get the current value (if any), and returns a
     * [Deferred] which will be resolved with that value (or `null`) when complete.
     */
    suspend fun getAsync(
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): Deferred<T?> = scope.async(coroutineContext) { fetch() }

    /**
     * Sets the value of the [ArcsSingleton] to the provided [value] and returns whether or not the
     * update could be applied.
     */
    suspend fun store(value: T): Boolean {
        activated.await()
        val (success, op) = crdtMutex.withLock {
            makeUpdateOp(value).let { crdtSingleton.applyOperation(it) to it }
                .also { updateCache() }
        }
        return success && applyOperationToStore(op)
    }

    /** TODO(heimlich): remove once API updates are in */
    suspend fun set(value: T): Boolean = store(value)

    /**
     * Launches a coroutine to set the value of the [ArcsSingleton] to the provided [value] and
     * returns a [Deferred] which will be resolved to whether or not the update could be applied.
     */
    suspend fun storeAsync(
        value: T,
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): Deferred<Boolean> = scope.async(coroutineContext) { store(value) }

    /**
     * Clears the value from the [ArcsSingleton] and returns whether or not the clearing operation
     * was successful.
     */
    suspend fun clear(): Boolean {
        activated.await()
        val (success, op) = crdtMutex.withLock {
            makeClearOp().let { crdtSingleton.applyOperation(it) to it }
                .also { updateCache() }
        }
        return if (success) applyOperationToStore(op) else false
    }

    /**
     * Launches a coroutine to clear the value from the [ArcsSingleton] and returns a [Deferred]
     * which will be resolved to whether or not the operation was successful.
     */
    suspend fun clearAsync(
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): Deferred<Boolean> = scope.async(coroutineContext) { clear() }

    /** Initiates a sync with the backing store. */
    suspend fun sync(coroutineContext: CoroutineContext = scope.coroutineContext): Job {
        val (job, isNewlyCreated) = crdtMutex.withLock { maybeStartSyncJob() }
        if (isNewlyCreated) {
            scope.launch(coroutineContext) {
                activated.await().onProxyMessage(ProxyMessage.SyncRequest(callbackId))
            }
        }
        return job
    }

    /** Returns the current sync job, and whether or not we had to make a new one. */
    private suspend fun maybeStartSyncJob(): Pair<Job, Boolean> {
        syncJob?.takeIf { it.isActive }?.let {
            log.debug { "Ongoing sync already" }
            return it to false
        }
        log.debug { "Creating new sync job" }
        return (Job(coroutineContext[Job.Key]) to true)
            .also { (job, _) ->
                syncJob = job
                job.invokeOnCompletion { log.debug { "Sync complete." } }
            }
    }

    private suspend fun applyOperationToStore(op: CrdtSingleton.Operation<T>): Boolean =
        applyOperationsToStore(listOf(op))

    private suspend fun applyOperationsToStore(ops: List<CrdtSingleton.Operation<T>>): Boolean =
        activated.await().onProxyMessage(
            ProxyMessage.Operations(ops.map { toStoreOp(it) }, callbackId)
        )

    @Suppress("UNCHECKED_CAST")
    private suspend fun handleStoreCallback(message: ProxyMessage<StoreData, StoreOp, T>): Boolean {
        log.debug { "handleStoreCallback() Received message from store: $message" }
        val messageBackToStore = crdtMutex.withLock {
            when (message) {
                is ProxyMessage.SyncRequest ->
                    ProxyMessage.ModelUpdate(toStoreData(crdtSingleton.data), callbackId)
                is ProxyMessage.Operations ->
                    handleOperationsMessage(message)
                is ProxyMessage.ModelUpdate ->
                    handleModelUpdateMessage(message).also { syncJob?.complete() }
            }.also { updateCache() }
        }
        return messageBackToStore?.let {
            log.debug { "handleStoreCallback() sending message to store: $it" }
            activated.await().onProxyMessage(it)
        } ?: true
    }

    private fun handleModelUpdateMessage(
        message: ProxyMessage.ModelUpdate<StoreData, StoreOp, T>
    ): ProxyMessage<StoreData, StoreOp, T>? {
        val (_, otherChanges) = crdtSingleton.merge(message.model)
        return when (otherChanges) {
            is CrdtChange.Operations -> {
                if (otherChanges.ops.isNotEmpty()) {
                    // We can send operations back to the activeStore.
                    ProxyMessage.Operations(otherChanges.ops.map(toStoreOp), callbackId)
                } else null
            }
            is CrdtChange.Data -> {
                if (otherChanges.data != crdtSingleton.data) {
                    // If there should be changes sent to the activeStore, send 'em.
                    ProxyMessage.ModelUpdate(toStoreData(otherChanges.data), callbackId)
                } else null
            }
        }
    }

    private fun handleOperationsMessage(
        message: ProxyMessage.Operations<StoreData, StoreOp, T>
    ): ProxyMessage<StoreData, StoreOp, T>? {
        if (message.operations.none { !crdtSingleton.applyOperation(it) }) return null
        // Couldn't apply some operations, need to request a sync.
        return ProxyMessage.SyncRequest(callbackId)
    }

    private fun updateCache() {
        cachedVersion = crdtSingleton.versionMap
        cachedConsumerData = crdtSingleton.consumerView
    }

    /**
     * Creates an [CrdtSingleton.Operation.Update] operation to apply to the local [crdtSingleton].
     */
    private fun makeUpdateOp(value: T): CrdtSingleton.Operation.Update<T> {
        cachedVersion[actor]++
        return CrdtSingleton.Operation.Update(actor, cachedVersion.copy(), value)
    }

    /**
     * Creates a [CrdtSingleton.Operation.Clear] operation to apply to the local [crdtSingleton].
     */
    private fun makeClearOp(): CrdtSingleton.Operation.Clear<T> =
        CrdtSingleton.Operation.Clear(actor, cachedVersion.copy())
}
