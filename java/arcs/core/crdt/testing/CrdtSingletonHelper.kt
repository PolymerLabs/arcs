package arcs.core.crdt.testing

import arcs.core.common.Referencable
import arcs.core.crdt.Actor
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap

/**
 * Helper for interacting with a [CrdtSingleton] in tests. Provides convenience methods for
 * constructing CRDT operations and sending them to the [singleton]. Maintains its own internal CRDT
 * [VersionMap] so that you don't have to!
 */
class CrdtSingletonHelper<T : Referencable>(
  private val actor: Actor,
  private val singleton: CrdtSingleton<T>
) {
  val versionMap = VersionMap()

  /** Sets the value of the singleton to [value]. */
  fun update(value: T) {
    val success = singleton.applyOperation(createUpdateOp(value))
    check(success) { "Failed to update CrdtSingleton value to '$value'." }
  }

  /** Clears the value of the singleton. */
  fun clear() {
    val success = singleton.applyOperation(createClearOp())
    check(success) { "Failed to clear CrdtSingleton." }
  }

  private fun createUpdateOp(value: T): CrdtSingleton.Operation.Update<T> {
    versionMap.increment(actor)
    return CrdtSingleton.Operation.Update(actor, versionMap, value)
  }

  private fun createClearOp(): CrdtSingleton.Operation.Clear<T> {
    // Don't increment version map for removals.
    return CrdtSingleton.Operation.Clear(actor, versionMap)
  }
}
