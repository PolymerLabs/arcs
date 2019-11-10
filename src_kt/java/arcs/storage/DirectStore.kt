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

package arcs.storage

import arcs.arcs.util.TaggedLog
import arcs.crdt.CrdtChange
import arcs.crdt.CrdtData
import arcs.crdt.CrdtException
import arcs.crdt.CrdtModel
import arcs.crdt.CrdtModelType
import arcs.crdt.CrdtOperation
import arcs.storage.DirectStore.State.Name.AwaitingDriverModel
import arcs.storage.DirectStore.State.Name.AwaitingResponse
import arcs.storage.DirectStore.State.Name.Idle
import kotlin.coroutines.coroutineContext
import kotlinx.atomicfu.AtomicRef
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.getAndUpdate
import kotlinx.atomicfu.update
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Job

/**
 * An [ActiveStore] capable of communicating directly with a [Driver].
 *
 * This is what *directly* manages a [CrdtSingleton], [CrdtSet], or [CrdtCount].
 */
// TODO: generics here are sub-optimal, can we make this class generic itself?
class DirectStore internal constructor(
    options: StoreOptions<CrdtData, CrdtOperation, Any?>,
    internal val localModel: CrdtModel<CrdtData, CrdtOperation, Any?>,
    internal val driver: Driver<CrdtData>
) : ActiveStore<CrdtData, CrdtOperation, Any?>(options) {
    override val versionToken: String?
        get() = driver.token

    private val log = TaggedLog { "DirectStore(${state.value})" }

    /**
     * [AtomicRef] of a [CompletableDeferred] which will be completed when the [DirectStore]
     * transitions into the Idle state.
     */
    private val idleDeferred: AtomicRef<IdleDeferred> = atomic(CompletableDeferred(Unit))
    /**
     * [AtomicRef] of a list of [PendingDriverModel]s, allowing us to treat it as a copy-on-write,
     * threadsafe list using [AtomicRef.update].
     */
    private var pendingDriverModels = atomic(listOf<PendingDriverModel>())
    private var version = atomic(0)
    private var state: AtomicRef<State> = atomic(State.Idle(idleDeferred, driver))
    private val nextCallbackToken = atomic(1)
    private val callbacks = atomic(mapOf<Int, ProxyCallback<CrdtData, CrdtOperation, Any?>>())

    override suspend fun idle() = state.value.idle()

    override suspend fun getLocalData(): CrdtData = synchronized(this) { localModel.data }

    override fun on(callback: ProxyCallback<CrdtData, CrdtOperation, Any?>): Int {
        val token = nextCallbackToken.getAndIncrement()
        callbacks.update { it + (token to callback) }
        return token
    }

    override fun off(callbackToken: Int) {
        callbacks.update { callbackMap ->
            return@update callbackMap - callbackToken
        }
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
        message: ProxyMessage<CrdtData, CrdtOperation, Any?>
    ): Boolean {
        return when (message) {
            is ProxyMessage.SyncRequest -> {
                callbacks.value[message.id]?.invoke(
                    ProxyMessage.ModelUpdate(localModel.data, message.id)
                )
                true
            }
            is ProxyMessage.Operations -> {
                val failure =
                    synchronized(this) {
                        !message.operations.all { localModel.applyOperation(it) }
                    }

                if (failure) {
                    callbacks.value[message.id]?.invoke(ProxyMessage.SyncRequest(message.id))
                    false
                } else {
                    if (message.operations.isNotEmpty()) {
                        val change = CrdtChange.Operations<CrdtData, CrdtOperation>(
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
        modelChange: CrdtChange<CrdtData, CrdtOperation>,
        otherChange: CrdtChange<CrdtData, CrdtOperation>?,
        version: Int,
        channel: Int?
    ) {
        if (modelChange.isEmpty() && otherChange?.isEmpty() != false) return

        deliverCallbacks(modelChange, messageFromDriver = false, channel = channel)
        updateStateAndAct(
            noDriverSideChanges(modelChange, otherChange, false),
            version,
            messageFromDriver = false
        )
    }

    internal suspend fun onReceive(data: CrdtData, version: Int) {
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

    private suspend fun applyPendingDriverModels(models: List<PendingDriverModel>) {
        if (models.isEmpty()) return

        log.debug { "Applying ${models.size} pending models: $models" }

        var noDriverSideChanges = true
        var theVersion = 0
        models.forEach { (model, version) ->
            try {
                val (modelChange, otherChange) = synchronized(this) { localModel.merge(model) }
                log.debug { "ModelChange: $modelChange" }
                log.debug { "OtherChange: $otherChange" }
                theVersion = version
                if (modelChange.isEmpty() && otherChange.isEmpty()) return@forEach
                deliverCallbacks(modelChange, messageFromDriver = true, channel = 0)
                noDriverSideChanges =
                    noDriverSideChanges && noDriverSideChanges(
                        modelChange,
                        otherChange,
                        messageFromDriver = true
                    )
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
        thisChange: CrdtChange<CrdtData, CrdtOperation>,
        otherChange: CrdtChange<CrdtData, CrdtOperation>?,
        messageFromDriver: Boolean
    ): Boolean {
        return if (messageFromDriver) {
            otherChange?.isEmpty() ?: true
        } else {
            thisChange.isEmpty()
        }
    }

    private suspend fun deliverCallbacks(
        thisChange: CrdtChange<CrdtData, CrdtOperation>,
        messageFromDriver: Boolean,
        channel: Int?
    ) {
        when {
            thisChange is CrdtChange.Operations && thisChange.ops.isNotEmpty() -> {
                callbacks.value.filter { messageFromDriver || channel != it.key }
                    .map { (id, callback) ->
                        callback(ProxyMessage.Operations(thisChange.ops, id))
                    }
            }
            thisChange is CrdtChange.Data -> {
                callbacks.value.filter { messageFromDriver || channel != it.key }
                    .map { (id, callback) ->
                        callback(ProxyMessage.ModelUpdate(thisChange.data, id))
                    }
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
            this.state.value = State.Idle(idleDeferred, driver)
            this.version.value = version
            return
        }

        // Wait until we're idle before we continue, unless - of course - we've been waiting on
        // driver model information, in which case - we can start without being idle.
        if (state.value !is State.AwaitingDriverModel) {
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
            this.state.value = newState
            this.version.value = currentVersion
            currentState = newState
            currentVersion = newVersion

            // Make sure we don't loop infinitely.
            check(++spins < MAX_UPDATE_SPINS) {
                "updateAndAct iterated too many times, limit: $MAX_UPDATE_SPINS"
            }
        } while (newState !is State.Idle && newState !is State.AwaitingDriverModel)

        // Finish applying the models from the driver, if we have any.
        val models = pendingDriverModels.value
        if (models.isNotEmpty()) {
            applyPendingDriverModels(models)
        }
    }

    private data class PendingDriverModel(val model: CrdtData, val version: Int)

    private suspend fun IdleDeferred(): CompletableDeferred<Unit> =
        CompletableDeferred(coroutineContext[Job.Key])

    private sealed class State(
        val stateName: Name,
        val idleDeferred: AtomicRef<IdleDeferred>,
        val driver: Driver<CrdtData>
    ) {
        /** Simple names for each [State]. */
        enum class Name { Idle, AwaitingResponse, AwaitingDriverModel }

        /**
         * The [DirectStore] is currently idle.
         */
        class Idle(
            idleDeferred: AtomicRef<IdleDeferred>,
            driver: Driver<CrdtData>
        ) : State(Idle, idleDeferred, driver) {
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
                localModel: CrdtData
            ): Pair<Int, State> {
                // On update() and when idle, we're ready to await the next version.
                return (version + 1) to AwaitingResponse(idleDeferred, driver)
            }
        }

        /**
         * On update: sends the local model to the driver and awaits a response.
         */
        class AwaitingResponse(
            idleDeferred: AtomicRef<IdleDeferred>,
            driver: Driver<CrdtData>
        ) : State(AwaitingResponse, idleDeferred, driver) {
            override fun shouldApplyPendingDriverModelsOnReceive(data: CrdtData, version: Int) =
                false

            override suspend fun update(
                version: Int,
                messageFromDriver: Boolean,
                localModel: CrdtData
            ): Pair<Int, State> {
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
        class AwaitingDriverModel(
            idleDeferred: AtomicRef<IdleDeferred>,
            driver: Driver<CrdtData>
        ) : State(AwaitingDriverModel, idleDeferred, driver) {
            override suspend fun update(
                version: Int,
                messageFromDriver: Boolean,
                localModel: CrdtData
            ): Pair<Int, State> {
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
            version: Int,
            messageFromDriver: Boolean,
            localModel: CrdtData
        ): Pair<Int, State> =
            version to this

        /**
         * Returns whether or not, given the machine being in this state, we should apply any
         * pending driver models to the local model.
         */
        open fun shouldApplyPendingDriverModelsOnReceive(data: CrdtData, version: Int): Boolean =
            true

        override fun toString(): String = "$stateName"
    }

    companion object {
        /**
         * To avoid an infinite loop OMG situation, set a maximum number of update spins for the
         * state machine to something large, but not *infinite*.
         */
        private const val MAX_UPDATE_SPINS = 1000

        @Suppress("UNCHECKED_CAST")
        val CONSTRUCTOR = StoreConstructor<CrdtData, CrdtOperation, Any?> { options ->
            val localModel =
                requireNotNull(options.type as? CrdtModelType<CrdtData, CrdtOperation, Any?>) {
                    "Specified type ${options.type} does not implement CrdtModelType"
                }.createCrdtModel()

            options.model?.let { localModel.merge(it) }

            val driver =
                CrdtException.requireNotNull(
                    DriverFactory.getDriver<CrdtData>(options.storageKey, options.existenceCriteria)
                ) { "No driver exists to support storage key ${options.storageKey}" }

            return@StoreConstructor DirectStore(
                options as StoreOptions<CrdtData, CrdtOperation, Any?>,
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
