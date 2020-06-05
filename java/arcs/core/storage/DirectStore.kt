/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.storage

import arcs.core.crdt.CrdtChange
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtModelType
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.DirectStore.State.Name.AwaitingDriverModel
import arcs.core.storage.DirectStore.State.Name.AwaitingResponse
import arcs.core.storage.DirectStore.State.Name.Idle
import arcs.core.storage.util.RandomProxyCallbackManager
import arcs.core.util.Random
import arcs.core.util.TaggedLog
import kotlin.coroutines.coroutineContext
import kotlinx.atomicfu.AtomicRef
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.getAndUpdate
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.ConflatedBroadcastChannel
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.combine

// import kotlinx.coroutines.flow.debounce
// import kotlinx.coroutines.flow.filter
// import kotlinx.coroutines.flow.first

/**
 * An [ActiveStore] capable of communicating directly with a [Driver].
 *
 * This is what *directly* manages a [CrdtSingleton], [CrdtSet], or [CrdtCount].
 */
@Suppress("EXPERIMENTAL_API_USAGE")
class DirectStore<Data : CrdtData, Op : CrdtOperation, T> /* internal */ constructor(
    options: StoreOptions<Data, Op, T>,
    /* internal */
    val localModel: CrdtModel<Data, Op, T>,
    /* internal */
    val driver: Driver<Data>
) : ActiveStore<Data, Op, T>(options),
    WriteBack by StoreWriteBack.create(driver.storageKey.protocol) {
    override val versionToken: String?
        get() = driver.token

    private val log = TaggedLog { "DirectStore(${state.value}, $storageKey)" }

    /**
     * [AtomicRef] of a [CompletableDeferred] which will be completed when the [DirectStore]
     * transitions into the Idle state.
     */
    private val idleDeferred: AtomicRef<IdleDeferred> = atomic(CompletableDeferred(Unit))
    /**
     * [AtomicRef] of a list of [PendingDriverModel]s, allowing us to treat it as a copy-on-write,
     * threadsafe list using [AtomicRef.update].
     */
    private var pendingDriverModels = atomic(listOf<PendingDriverModel<Data>>())
    private var version = atomic(0)
    private var state: AtomicRef<State<Data>> = atomic(State.Idle(idleDeferred, driver))
    private val stateChannel =
        ConflatedBroadcastChannel<State<Data>>(State.Idle(idleDeferred, driver))
    private val stateFlow = stateChannel.asFlow()
    private val proxyManager = RandomProxyCallbackManager<Data, Op, T>(
        "direct",
        Random
    )

    private val storeIdlenessFlow =
        combine(stateFlow, writebackIdlenessFlow) { state, writebackIsIdle ->
            state is State.Idle<*> && writebackIsIdle
        }

    override suspend fun idle() {
        // TODO: tune the debounce window
        // storeIdlenessFlow.debounce(50).filter { it }.first()
    }

    override suspend fun getLocalData(): Data = synchronized(this) { localModel.data }

    override fun on(callback: ProxyCallback<Data, Op, T>): Int {
        return proxyManager.register(callback)
    }

    override fun off(callbackToken: Int) {
        proxyManager.unregister(callbackToken)
        if (proxyManager.isEmpty()) {
            close()
        }
    }

    fun close() {
        stateChannel.offer(State.Closed())
    }

    /**
     * Receives operations/model-updates from connected storage proxies.
     *
     * Additionally, StorageProxy objects may request a SyncRequest, which will result in an
     * up-to-date model being sent back to that StorageProxy. A return value of `true` implies that
     * the message was accepted, a return value of `false` requires that the proxy send a model
     * sync.
     */
    override suspend fun onProxyMessage(
        message: ProxyMessage<Data, Op, T>
    ): Boolean {
        return when (message) {
            is ProxyMessage.SyncRequest -> {
                proxyManager.getCallback(message.id)?.invoke(
                    ProxyMessage.ModelUpdate(getLocalData(), message.id)
                )
                true
            }
            is ProxyMessage.Operations -> {
                val failure =
                    synchronized(this) {
                        !message.operations.all { localModel.applyOperation(it) }
                    }

                if (failure) {
                    proxyManager.getCallback(message.id)?.invoke(
                        ProxyMessage.SyncRequest(message.id)
                    )
                    false
                } else {
                    if (message.operations.isNotEmpty()) {
                        val change = CrdtChange.Operations<Data, Op>(
                            message.operations.toMutableList()
                        )
                        processModelChange(
                            change,
                            otherChange = null,
                            version = version.value,
                            channel = message.id
                        )
                    }
                    true
                }
            }
            is ProxyMessage.ModelUpdate -> {
                val (modelChange, otherChange) = synchronized(this) {
                    localModel.merge(message.model)
                }
                processModelChange(
                    modelChange,
                    otherChange,
                    version.value,
                    channel = message.id
                )
                true
            }
        }.also {
            log.debug { "Model after proxy message: ${localModel.data}" }
        }
    }

    private suspend fun processModelChange(
        modelChange: CrdtChange<Data, Op>,
        otherChange: CrdtChange<Data, Op>?,
        version: Int,
        channel: Int?
    ) {
        if (modelChange.isEmpty() && otherChange?.isEmpty() == true) return

        deliverCallbacks(modelChange, source = channel)

        // As the localModel has already been applied with new operations and/or merged with
        // new model updates, leave the flush job with write-back threads.
        val noDriverSideChanges = noDriverSideChanges(modelChange, otherChange, false)
        asyncFlush { updateStateAndAct(noDriverSideChanges, version, messageFromDriver = false) }
    }

    /* internal */ suspend fun onReceive(data: Data, version: Int) {
        log.debug { "onReceive($data, $version)" }

        if (state.value.shouldApplyPendingDriverModelsOnReceive(data, version)) {
            val pending = pendingDriverModels.getAndUpdate { emptyList() }
            applyPendingDriverModels(pending + PendingDriverModel(data, version))
        } else {
            // If the current state doesn't allow us to apply the models yet, tack it onto our
            // pending list.
            pendingDriverModels.getAndUpdate { it + PendingDriverModel(data, version) }
        }
    }

    private suspend fun applyPendingDriverModels(models: List<PendingDriverModel<Data>>) {
        if (models.isEmpty()) return

        log.debug { "Applying ${models.size} pending models: $models" }

        var noDriverSideChanges = true
        var theVersion = 0
        models.forEach { (model, version) ->
            try {
                log.debug { "Merging $model into ${localModel.data}" }
                val (modelChange, otherChange) = synchronized(this) { localModel.merge(model) }
                log.debug { "ModelChange: $modelChange" }
                log.debug { "OtherChange: $otherChange" }
                theVersion = version
                if (modelChange.isEmpty() && otherChange.isEmpty()) return@forEach
                deliverCallbacks(modelChange, null)
                noDriverSideChanges =
                    noDriverSideChanges && noDriverSideChanges(
                        modelChange,
                        otherChange,
                        messageFromDriver = true
                    )
                log.debug { "No driver side changes? $noDriverSideChanges" }
            } catch (e: Exception) {
                log.error(e) { "Error while applying pending driver models." }
                idleDeferred.value.completeExceptionally(e)
                throw e
            }
        }
        updateStateAndAct(noDriverSideChanges, theVersion, messageFromDriver = true)
    }

    /**
     * Note that driver-side changes are stored in 'otherChange' when the merged operations/model is
     * sent from the driver, and 'thisChange' when the merged operations/model is sent from a
     * storageProxy. In the former case, we want to look at what has changed between what the driver
     * sent us and what we now have. In the latter, the driver is only as up-to-date as our local
     * model before we've applied the operations.
     */
    private fun noDriverSideChanges(
        thisChange: CrdtChange<Data, Op>,
        otherChange: CrdtChange<Data, Op>?,
        messageFromDriver: Boolean
    ): Boolean {
        return if (messageFromDriver) {
            otherChange?.isEmpty() ?: true
        } else {
            thisChange.isEmpty()
        }
    }

    private suspend fun deliverCallbacks(
        thisChange: CrdtChange<Data, Op>,
        source: Int?
    ) {
        when (thisChange) {
            is CrdtChange.Operations -> {
                proxyManager.send(
                    message = ProxyMessage.Operations(thisChange.ops, source),
                    exceptTo = source
                )
            }
            is CrdtChange.Data -> {
                proxyManager.send(
                    message = ProxyMessage.ModelUpdate(thisChange.data, source),
                    exceptTo = source)
            }
        }
    }

    /**
     * This function implements a state machine that controls when data is sent to the driver.
     *
     * You can see the state machine in all its glory
     * [here](https://github.com/PolymerLabs/arcs/wiki/Store-object-State-Machine).
     */
    private suspend fun updateStateAndAct(
        noDriverSideChanges: Boolean,
        version: Int,
        messageFromDriver: Boolean
    ) {
        if (noDriverSideChanges) {
            // TODO: use a single lock here, rather than two separate atomics.
            this.state.value = State.Idle(idleDeferred, driver).also { /* stateChannel.send(it) */ }
            this.version.value = version
            return
        }

        // Wait until we're idle before we continue, unless - of course - we've been waiting on
        // driver model information, in which case - we can start without being idle.
        if (state.value !is State.AwaitingDriverModel<Data>) {
            // Await is called on the old value of idleDeferred.
            idleDeferred.getAndSet(IdleDeferred()).await()
        }

        var currentState = state.value
        var currentVersion = version
        var spins = 0
        do {
            val localModel = synchronized(this) { localModel.data }
            val (newVersion, newState) =
                currentState.update(currentVersion, messageFromDriver, localModel)
            // TODO: use a lock instead here, rather than two separate atomics.
            this.state.value = newState.also { stateChannel.send(it) }
            this.version.value = currentVersion
            currentState = newState
            currentVersion = newVersion

            // Make sure we don't loop infinitely.
            check(++spins < MAX_UPDATE_SPINS) {
                "updateAndAct iterated too many times, limit: $MAX_UPDATE_SPINS"
            }
        } while (newState !is State.Idle<Data> && newState !is State.AwaitingDriverModel<Data>)

        // Finish applying the models from the driver, if we have any.
        val models = pendingDriverModels.getAndSet(emptyList())
        if (models.isNotEmpty()) {
            applyPendingDriverModels(models)
        }
    }

    private data class PendingDriverModel<Data : CrdtData>(val model: Data, val version: Int)

    private suspend fun IdleDeferred(): CompletableDeferred<Unit> =
        CompletableDeferred(coroutineContext[Job.Key])

    private sealed class State<Data : CrdtData>(val stateName: Name) {
        /** Simple names for each [State]. */
        enum class Name { Idle, AwaitingResponse, AwaitingDriverModel, Closed }

        open class StateWithData<Data : CrdtData>(
            stateName: Name,
            val idleDeferred: AtomicRef<IdleDeferred>,
            val driver: Driver<Data>
        ) : State<Data>(stateName) {
            /** Waits until the [idleDeferred] signal is triggered. */
            open suspend fun idle() = idleDeferred.value.await()

            /**
             * Determines the next state and version of the model while acting. (e.g. sending the
             * [localModel] to the [Driver])
             *
             * Core component of the state machine, called by [DirectStore.updateStateAndAct] to
             * determine what state to transition into and perform any necessary operations.
             */
            open suspend fun update(
                version: Int, messageFromDriver: Boolean, localModel: Data
            ): Pair<Int, StateWithData<Data>> = version to this

            /**
             * Returns whether or not, given the machine being in this state, we should apply any
             * pending driver models to the local model.
             */
            open fun shouldApplyPendingDriverModelsOnReceive(data: Data, version: Int): Boolean =
                true
        }

        class Closed<Data : CrdtData> : State<Data>(Name.Closed)

        /**
         * The [DirectStore] is currently idle.
         */
        class Idle<Data : CrdtData>(
            idleDeferred: AtomicRef<IdleDeferred>,
            driver: Driver<Data>
        ) : StateWithData<Data>(Idle, idleDeferred, driver) {
            init {
                // When a new idle state is created, complete the deferred so anything waiting on it
                // will unblock.
                idleDeferred.value.complete(Unit)
            }

            // We're already in idle state, so no need to do anything.
            override suspend fun idle() = Unit

            override suspend fun update(
                version: Int,
                messageFromDriver: Boolean,
                localModel: Data
            ): Pair<Int, StateWithData<Data>> {
                // On update() and when idle, we're ready to await the next version.
                return (version + 1) to AwaitingResponse(idleDeferred, driver)
            }
        }

        /**
         * On update: sends the local model to the driver and awaits a response.
         */
        class AwaitingResponse<Data : CrdtData>(
            idleDeferred: AtomicRef<IdleDeferred>,
            driver: Driver<Data>
        ) : StateWithData<Data>(AwaitingResponse, idleDeferred, driver) {
            override fun shouldApplyPendingDriverModelsOnReceive(data: Data, version: Int) =
                false

            override suspend fun update(
                version: Int,
                messageFromDriver: Boolean,
                localModel: Data
            ): Pair<Int, StateWithData<Data>> {
                val response = driver.send(localModel, version)
                return if (response) {
                    // The driver ack'd our send, we can move to idle state.
                    version to Idle(idleDeferred, driver)
                } else {
                    // The driver didn't ack, so we need to move to AwaitingDriverModel.
                    version to AwaitingDriverModel(idleDeferred, driver)
                }
            }
        }

        /**
         * Awaiting a model from the driver after a failed send.
         */
        class AwaitingDriverModel<Data : CrdtData>(
            idleDeferred: AtomicRef<IdleDeferred>,
            driver: Driver<Data>
        ) : StateWithData<Data>(AwaitingDriverModel, idleDeferred, driver) {
            override suspend fun update(
                version: Int,
                messageFromDriver: Boolean,
                localModel: Data
            ): Pair<Int, StateWithData<Data>> {
                // If the message didn't come from the driver, we can't do anything.
                if (!messageFromDriver) return version to this

                // This loop implements:
                //     sending -> AwaitingResponse -> AwaitingResponseDirty -> sending.
                // Breakouts happen if:
                //  (1) a response arrives while still AwaitingResponse. This returns the store to
                //      Idle.
                //  (2) a negative response arrives. This means we're now waiting for driver models
                //      (AwaitingDriverModel). Note that in this case we are likely to end up back
                //      in this loop when a driver model arrives.
                return (version + 1) to AwaitingResponse(idleDeferred, driver)
            }
        }

        override fun toString(): String = "$stateName"
    }

    companion object {
        /**
         * To avoid an infinite loop OMG situation, set a maximum number of update spins for the
         * state machine to something large, but not *infinite*.
         */
        private const val MAX_UPDATE_SPINS = 1000

        @Suppress("UNCHECKED_CAST")
        suspend fun <Data : CrdtData, Op : CrdtOperation, T> create(
            options: StoreOptions<Data, Op, T>
        ): DirectStore<Data, Op, T> {
            val crdtType = requireNotNull(options.type as CrdtModelType<Data, Op, T>) {
                "Type not supported: ${options.type}"
            }

            val driver =
                CrdtException.requireNotNull(
                    DriverFactory.getDriver(
                        options.storageKey,
                        crdtType.crdtModelDataClass,
                        options.type
                    ) as? Driver<Data>
                ) { "No driver exists to support storage key ${options.storageKey}" }

            val localModel = crdtType.createCrdtModel().apply {
                options.model?.let { merge(it) }
            }

            return DirectStore(
                options,
                localModel = localModel,
                driver = driver
            ).also { store ->
                driver.registerReceiver(options.versionToken) { data, version ->
                    store.onReceive(data, version)
                }
            }
        }
    }
}
private typealias IdleDeferred = CompletableDeferred<Unit>
