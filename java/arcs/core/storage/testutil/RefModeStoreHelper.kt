package arcs.core.storage.testutil

import arcs.core.common.ReferenceId
import arcs.core.crdt.Actor
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.storage.ActiveStore
import arcs.core.storage.CallbackToken
import arcs.core.storage.ProxyMessage
import arcs.core.storage.ReferenceModeStore
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.RefModeStoreOutput

/**
 * Helper for interacting with [ReferenceModeStore] in tests. Provides convenience methods for
 * constructing CRDT operations and sending them to the store. Maintains its own internal CRDT
 * [VersionMap] so that you don't have to!
 *
 * [RefModeStoreHelper] supplies methods for operating on both singletons and collections, but the
 * [store] that it wraps will only support operations for one of those, so be careful to use the
 * right one.
 */
class RefModeStoreHelper(
  private val actor: Actor,
  private val store: ActiveStore<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>,
  /**
   * Optional token used to identify the source of each [ProxyMessage] sent to the store. This is
   * usually obtained from calling [ActiveStore.on]. Updates will not be reflected back to the
   * listener with the same ID. Unless you care about that, you can ignore this field.
   */
  private val callbackToken: CallbackToken = 1
) {
  private val versionMap = VersionMap()

  /** Updates a singleton to the given [value]. */
  suspend fun sendUpdateOp(value: RawEntity) {
    sendOps(createUpdateOp(value))
  }

  /** Adds the given [element] to the collection. */
  suspend fun sendAddOp(element: RawEntity) {
    sendOps(createAddOp(element))
  }

  /** Removes the given [element] to the collection. */
  suspend fun sendRemoveOp(element: ReferenceId) {
    sendOps(createRemoveOp(element))
  }

  /** Clears the singleton. */
  suspend fun sendSingletonClearOp() {
    sendOps(createSingletonClearOp())
  }

  /** Clears the collection. */
  suspend fun sendCollectionClearOp() {
    sendOps(createCollectionClearOp())
  }

  /** Send the given [ops] to the [store]. */
  suspend fun sendOps(vararg ops: RefModeStoreOp) {
    store.onProxyMessage(ProxyMessage.Operations(ops.toList(), id = callbackToken))
  }

  private fun createUpdateOp(value: RawEntity): RefModeStoreOp.SingletonUpdate {
    versionMap.increment(actor)
    return RefModeStoreOp.SingletonUpdate(actor, versionMap.copy(), value)
  }

  private fun createAddOp(element: RawEntity): RefModeStoreOp.SetAdd {
    versionMap.increment(actor)
    return RefModeStoreOp.SetAdd(actor, versionMap.copy(), element)
  }

  private fun createRemoveOp(element: ReferenceId): RefModeStoreOp.SetRemove {
    // Don't increment version map for removals.
    return RefModeStoreOp.SetRemove(actor, versionMap.copy(), element)
  }

  private fun createSingletonClearOp(): RefModeStoreOp.SingletonClear {
    // Don't increment version map for removals.
    return RefModeStoreOp.SingletonClear(actor, versionMap.copy())
  }

  private fun createCollectionClearOp(): RefModeStoreOp.SetClear {
    // Don't increment version map for removals.
    return RefModeStoreOp.SetClear(actor, versionMap.copy())
  }
}
