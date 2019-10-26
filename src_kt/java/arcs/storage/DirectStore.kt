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

import arcs.crdt.CrdtChange
import arcs.crdt.CrdtData
import arcs.crdt.CrdtException
import arcs.crdt.CrdtModel
import arcs.crdt.CrdtModelType
import arcs.crdt.CrdtOperation
import arcs.storage.DirectStore.State.Name.AwaitingDriverModel
import arcs.storage.DirectStore.State.Name.AwaitingResponse
import arcs.storage.DirectStore.State.Name.AwaitingResponseDirty
import arcs.storage.DirectStore.State.Name.Idle
import kotlinx.atomicfu.AtomicRef
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.getAndUpdate
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class DirectStore internal constructor(
  options: StoreOptions<CrdtData, CrdtOperation, Any?>,
  private val localModel: CrdtModel<CrdtData, CrdtOperation, Any?>,
  private val driver: Driver<CrdtData>
) : ActiveStore<CrdtData, CrdtOperation, Any?>(options) {
  override val versionToken: String?
    get() = driver.token

  /** Coroutine Scope to use for IO operations. */
  private val scope =
    CoroutineScope(Dispatchers.IO + CoroutineName("DirectStore $localModel"))

  /**
   * [AtomicRef] of a [CompletableDeferred] which will be completed when the [DirectStore]
   * transitions into the Idle state.
   */
  private val idleDeferred = atomic(IdleDeferred())
  private val nextCallbackId = atomic(1)
  private var version = atomic(0)
  private var pendingDriverModels = atomic(listOf<PendingDriverModel>())
  private var state: AtomicRef<State> = atomic(State.Idle(idleDeferred, driver, ::setState))
  private val callbacks = atomic(mapOf<Int, ProxyCallback<CrdtData, CrdtOperation, Any?>>())

  init {
    driver.registerReceiver(options.versionToken, this::onReceive)
  }

  override suspend fun getLocalData(): CrdtData = synchronized(this) { localModel.data }

  override suspend fun idle() {
    state.value.idle()
  }

  override fun on(callback: ProxyCallback<CrdtData, CrdtOperation, Any?>): Int {
    TODO("not implemented")
  }

  override fun off(callbackToken: Int) {
    TODO("not implemented")
  }

  override suspend fun onProxyMessage(
    message: ProxyMessage<CrdtData, CrdtOperation, Any?>
  ): Boolean {
    TODO("not implemented")
  }

  private fun onReceive(data: CrdtData, version: Int) {
    if (state.value.shouldApplyPendingDriverModelsOnReceive(data, version)) {
      scope.launch {
        pendingDriverModels.getAndUpdate { pendingModels ->
          applyPendingDriverModels(pendingModels + PendingDriverModel(data, version))
          return@getAndUpdate emptyList()
        }
      }
    } else {
      pendingDriverModels.getAndUpdate { it + PendingDriverModel(data, version) }
    }
  }

  private fun setState(newState: State) {
    state.value = newState
  }

  private suspend fun applyPendingDriverModels(models: List<PendingDriverModel>) {
    if (models.isEmpty()) return

    var noDriverSideChanges = true
    var theVersion = 0
    models.forEach { (model, version) ->
      try {
        val (modelChange, otherChange) = synchronized(this) { localModel.merge(model) }
        deliverCallbacks(modelChange, messageFromDriver = true, channel = 0)
        noDriverSideChanges =
          noDriverSideChanges && noDriverSideChanges(
            modelChange,
            otherChange,
            messageFromDriver = true
          )
        theVersion = version
      } catch (e: Exception) {
        idleDeferred.value.completeExceptionally(e)
        throw e
      }
    }
    updateStateAndAct(noDriverSideChanges, theVersion, true)
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
    otherChange: CrdtChange<CrdtData, CrdtOperation>,
    messageFromDriver: Boolean
  ): Boolean {
    return if (messageFromDriver) {
      otherChange is CrdtChange.Operations && otherChange.ops.isEmpty()
    } else {
      thisChange is CrdtChange.Operations && thisChange.ops.isEmpty()
    }
  }

  private fun deliverCallbacks(
    thisChange: CrdtChange<CrdtData, CrdtOperation>,
    messageFromDriver: Boolean,
    channel: Int
  ) {
    when {
      thisChange is CrdtChange.Operations && thisChange.ops.isNotEmpty() -> {
        callbacks.value.filter { messageFromDriver || channel != it.key }
          .map { (id, callback) ->
            scope.launch { callback(ProxyMessage.Operations(thisChange.ops, id)) }
          }
      }
      thisChange is CrdtChange.Data -> {
        callbacks.value.filter { messageFromDriver || channel != it.key }
          .map { (id, callback) ->
            scope.launch { callback(ProxyMessage.ModelUpdate(thisChange.data, id)) }
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
      setState(State.Idle(idleDeferred, driver, ::setState))
      this.version.value = version
      return
    }

    this.version.value = state.value.update(messageFromDriver, version)
  }

  /*
  private async updateStateAndAct(noDriverSideChanges: boolean, version: number, messageFromDriver: boolean) {
    // Don't send to the driver if we're already in sync and there are no driver-side changes.
    if (noDriverSideChanges) {
      // Need to record the driver version so that we can continue to send.
      this.setState(DirectStoreState.Idle);
      this.version = version;
      return;
    }
    switch (this.state) {
      case DirectStoreState.AwaitingDriverModel:
        if (!messageFromDriver) {
          return;
        }
        // This loop implements sending -> AwaitingResponse -> AwaitingResponseDirty -> sending.
        // Breakouts happen if:
        //  (1) a response arrives while still AwaitingResponse. This returns the store to Idle.
        //  (2) a negative response arrives. This means we're now waiting for driver models
        //      (AwaitingDriverModel). Note that in this case we are likely to end up back in
        //      this loop when a driver model arrives.
        while (true) {
          this.setState(DirectStoreState.AwaitingResponse);
          this.state = DirectStoreState.AwaitingResponse;
          this.version = ++version;
          const response = await this.driver.send(this.localModel.getData(), version);
          if (response) {
            if (this.state === DirectStoreState.AwaitingResponse) {
              this.setState(DirectStoreState.Idle);
              this.applyPendingDriverModels();
              break;
            }
            if (this.state !== DirectStoreState.AwaitingResponseDirty) {
              // This shouldn't be possible as only a 'nack' should put us into
              // AwaitingDriverModel, and only the above code should put us back
              // into Idle.
              throw new Error('reached impossible state in store state machine');
            }
            // fallthrough to re-execute the loop.
          } else {
            this.setState(DirectStoreState.AwaitingDriverModel);
            this.applyPendingDriverModels();
            break;
          }
        }
        return;
      case DirectStoreState.Idle:
        // This loop implements sending -> AwaitingResponse -> AwaitingResponseDirty -> sending.
        // Breakouts happen if:
        //  (1) a response arrives while still AwaitingResponse. This returns the store to Idle.
        //  (2) a negative response arrives. This means we're now waiting for driver models
        //      (AwaitingDriverModel). Note that in this case we are likely to end up back in
        //      this loop when a driver model arrives.
        while (true) {
          this.setState(DirectStoreState.AwaitingResponse);
          this.state = DirectStoreState.AwaitingResponse;
          this.version = ++version;
          const response = await this.driver.send(this.localModel.getData(), version);
          if (response) {
            if (this.state === DirectStoreState.AwaitingResponse) {
              this.setState(DirectStoreState.Idle);
              this.applyPendingDriverModels();
              break;
            }
            if (this.state !== DirectStoreState.AwaitingResponseDirty) {
              // This shouldn't be possible as only a 'nack' should put us into
              // AwaitingDriverModel, and only the above code should put us back
              // into Idle.
              throw new Error('reached impossible state in store state machine');
            }
            // fallthrough to re-execute the loop.
          } else {
            this.setState(DirectStoreState.AwaitingDriverModel);
            this.applyPendingDriverModels();
            break;
          }
        }
        return;
      case DirectStoreState.AwaitingResponse:
        this.setState(DirectStoreState.AwaitingResponseDirty);
        return;
      case DirectStoreState.AwaitingResponseDirty:
        return;
      default:
        throw new Error('reached impossible default state in switch statement');
    }
  }
   */

  private data class PendingDriverModel(val model: CrdtData, val version: Int)
  private class IdleDeferred : CompletableDeferred<Unit> by CompletableDeferred()

  private sealed class State(
    val stateName: Name,
    val idleDeferred: AtomicRef<IdleDeferred>,
    val driver: Driver<CrdtData>,
    val sendStateTransition: (State) -> Unit
  ) {
    /** Waits until the [idleDeferred] signal is triggered. */
    open suspend fun idle() = idleDeferred.value.await()

    open suspend fun update(messageFromDriver: Boolean, version: Int): Int = version

    open fun shouldApplyPendingDriverModelsOnReceive(data: CrdtData, version: Int): Boolean = true

    override fun toString(): String = "$stateName"

    /** The [DirectStore] is currently idle. */
    class Idle(
      idleDeferred: AtomicRef<IdleDeferred>,
      driver: Driver<CrdtData>,
      stateTransitionReceiver: (State) -> Unit
    ) : State(Idle, idleDeferred, driver, stateTransitionReceiver) {
      init {
        // When a new idle state is created, complete the deferred so anything waiting on it will
        // unblock.
        idleDeferred.value.complete(Unit)
      }

      // We're already in idle state, so no need to do anything.
      override suspend fun idle() = Unit
    }

    class AwaitingResponse(
      idleDeferred: AtomicRef<IdleDeferred>,
      driver: Driver<CrdtData>,
      sendStateTransition: (State) -> Unit
    ) : State(AwaitingResponse, idleDeferred, driver, sendStateTransition) {
      override fun shouldApplyPendingDriverModelsOnReceive(data: CrdtData, version: Int) = false

      suspend fun updateFromAwaitingDriver(messageFromDriver: Boolean, version: Int): Int {
        var newVersion = version + 1

        val response = driver.send()
        const response = await this.driver.send(this.localModel.getData(), version);
        if (response) {
          if (this.state === DirectStoreState.AwaitingResponse) {
            this.setState(DirectStoreState.Idle);
            this.applyPendingDriverModels();
            break;
          }
          if (this.state !== DirectStoreState.AwaitingResponseDirty) {
            // This shouldn't be possible as only a 'nack' should put us into
            // AwaitingDriverModel, and only the above code should put us back
            // into Idle.
            throw new Error('reached impossible state in store state machine');
          }
          // fallthrough to re-execute the loop.
        } else {
          this.setState(DirectStoreState.AwaitingDriverModel);
          this.applyPendingDriverModels();
          break;
        }
        return version
      }
    }

    class AwaitingResponseDirty(
      idleDeferred: AtomicRef<IdleDeferred>,
      driver: Driver<CrdtData>,
      sendStateTransition: (State) -> Unit
    ) : State(AwaitingResponseDirty, idleDeferred, driver, sendStateTransition) {
      override fun shouldApplyPendingDriverModelsOnReceive(data: CrdtData, version: Int) = false
    }

    class AwaitingDriverModel(
      idleDeferred: AtomicRef<IdleDeferred>,
      driver: Driver<CrdtData>,
      sendStateTransition: (State) -> Unit
    ) : State(AwaitingDriverModel, idleDeferred, driver, sendStateTransition) {
      override suspend fun update(messageFromDriver: Boolean, version: Int): Int {
        if (!messageFromDriver) return version
        val newState = AwaitingResponse(idleDeferred, sendStateTransition)
        sendStateTransition(newState)
        return newState.updateFromAwaitingDriver(messageFromDriver, version)
      }
    }

    enum class Name {
      Idle,
      AwaitingResponse,
      AwaitingResponseDirty,
      AwaitingDriverModel,
    }
  }


  companion object {
    @Suppress("UNCHECKED_CAST")
    val CONSTRUCTOR = StoreConstructor<CrdtData, CrdtOperation, Any?> { options ->
      /*
      const me = new DirectStore<T>(options);
    me.localModel = new (options.type.crdtInstanceConstructor<T>())();
    if (options.model) {
      me.localModel.merge(options.model);
    }
    me.driver = await DriverFactory.driverInstance(options.storageKey, options.exists);
    if (me.driver == null) {
      throw new CRDTError(`No driver exists to support storage key ${options.storageKey}`);
    }
    me.driver.registerReceiver(me.onReceive.bind(me), options.versionToken);
    return me;
       */
      val localModel =
        requireNotNull(
          options.type as? CrdtModelType<CrdtData, CrdtOperation, Any?>
        ) { "Specified type ${options.type} does not implement CrdtModelType" }.createCrdtModel()

      options.model?.let { localModel.merge(it) }

      val driver =
        CrdtException.requireNotNull(
          DriverFactory.getDriver<CrdtData>(options.storageKey, options.existenceCriteria)
        ) { "No driver exists to support storage key ${options.storageKey}" }

      return@StoreConstructor DirectStore(
        options as StoreOptions<CrdtData, CrdtOperation, Any?>,
        localModel = localModel,
        driver = driver
      )
    }
  }
}
