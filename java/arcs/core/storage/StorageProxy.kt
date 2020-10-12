package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.VersionMap
import arcs.core.util.Scheduler
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Deferred

/**
 * [StorageProxy] is an intermediary between a [Handle] and [ActiveStore]. It provides up-to-date CRDT
 * state to readers, and ensures write operations apply cleanly before forwarding to the store.
 */
interface StorageProxy<Data : CrdtData, Op : CrdtOperationAtTime, T> {
  /** The [StorageKey] that identifies the [ActiveStore] this proxy communicates with. */
  val storageKey: StorageKey

  /**
   * If you need to interact with the data managed by this [StorageProxy], and you're not a
   * [ActiveStore], you must either be performing your interactions within a handle callback or on this
   * [CoroutineDispatcher].
   */
  val dispatcher: CoroutineDispatcher

  /**
   * If the [StorageProxy] is associated with any readable handles, it will need to operate
   * in synchronized mode. This is done via a two-step process:
   *   1) When constructed, all readable handles call this method to move the proxy from its
   *      initial state of [NO_SYNC] to [READY_TO_SYNC].
   *   2) [ParticleContext] then triggers the actual sync request after the arc has been
   *      set up and all particles have received their onStart events.
   */
  fun prepareForSync()

  /**
   * If the [StorageProxy] has previously been set up for synchronized mode, send a sync request
   * to the backing store and move to [AWAITING_SYNC].
   */
  fun maybeInitiateSync()

  /**
   * [AbstractArcHost] calls this (via [Handle]) to thread storage events back
   * to the [ParticleContext], which manages the [Particle] lifecycle API.
   */
  fun registerForStorageEvents(id: CallbackIdentifier, notify: (StorageEvent) -> Unit)

  /**
   * Add a [Handle] `onReady` action associated with a [Handle] name.
   *
   * If the [StorageProxy] is synchronized when the action is added, it will be called
   * on the next iteration of the [Scheduler].
   */
  fun addOnReady(id: CallbackIdentifier, action: () -> Unit)

  /**
   * Add a [Handle] `onUpdate` action associated with a [Handle] name.
   */
  fun addOnUpdate(id: CallbackIdentifier, action: (oldValue: T, newValue: T) -> Unit)

  /**
   * Add a [Handle] `onDesync` action associated with a [Handle] name.
   *
   * If the [StorageProxy] is desynchronized when the action is added, it will be called
   * on the next iteration of the [Scheduler].
   */
  fun addOnDesync(id: CallbackIdentifier, action: () -> Unit)

  /**
   * Add a [Handle] `onResync` action associated with a [Handle] name.
   */
  fun addOnResync(id: CallbackIdentifier, action: () -> Unit)

  /**
   *  Remove all `onUpdate`, `onReady`, `onDesync` and `onResync` callbacks associated with the
   *  provided `handleName`.
   *
   * A [Handle] that is being removed from active usage should make sure to trigger this method
   * on its associated [StorageProxy].
   */
  fun removeCallbacksForName(id: CallbackIdentifier)

  /**
   * Closes this [StorageProxy]. It no longer receives messages from its associated [ActiveStore].
   * Attempting to perform an operation on a closed [StorageProxy] will result in an exception
   * being thrown.
   */
  suspend fun close()

  /**
   * Apply a CRDT operation to the [CrdtModel] that this [StorageProxy] manages, notifies read
   * handles, and forwards the write to the [ActiveStore].
   */
  @Suppress("DeferredIsResult")
  fun applyOp(op: Op): Deferred<Boolean> = applyOps(listOf(op))

  /**
   * Applies an ordered [List] of CRDT operations to the [CrdtModel] that this [StorageProxy]
   * manages, notifies read handles, and forwards the writes to the [ActiveStore].
   */
  @Suppress("DeferredIsResult")
  fun applyOps(ops: List<Op>): Deferred<Boolean>

  /**
   * Return a copy of the current version map.
   */
  fun getVersionMap(): VersionMap

  /**
   * Return the current local version of the model. Suspends until it has a synchronized view of
   * the data.
   */
  suspend fun getParticleView(): T

  /**
   * Similar to [getParticleView], but requires the current proxy to have been synced at least
   * once, and also requires the caller to be running within the [Scheduler]'s thread.
   */
  fun getParticleViewUnsafe(): T

  /**
   * Suspends until there are no more outgoing messages or handle notifications in flight.
   */
  suspend fun waitForIdle()

  /** Returns true if there are no more outgoing messages or notification in flight. */
  suspend fun isIdle(): Boolean

  /**
   * Suspends the coroutine while the [store] is busy processing our "outgoing messages".
   */
  suspend fun awaitOutgoingMessageQueueDrain()

  /**
   * Two-dimensional identifier for handle callbacks. Typically this will be the handle's name,
   * as well as its particle's ID.
   */
  data class CallbackIdentifier(val handleName: String, val namespace: String = "")

  /**
   * Event types used for notifying the [ParticleContext] to drive the [Particle]'s
   * storage events API.
   */
  enum class StorageEvent {
    READY,
    UPDATE,
    DESYNC,
    RESYNC
  }
}
