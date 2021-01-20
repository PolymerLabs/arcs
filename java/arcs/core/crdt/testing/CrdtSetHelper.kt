package arcs.core.crdt.testing

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.Actor
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap

/**
 * Helper for interacting with a [CrdtSet] in tests. Provides convenience methods for
 * constructing CRDT operations and sending them to the [set]. Maintains its own internal CRDT
 * [VersionMap] so that you don't have to!
 */
class CrdtSetHelper<T : Referencable>(
  private val actor: Actor,
  private val set: CrdtSet<T>
) {
  val versionMap = VersionMap()

  /** Adds [element] to the set. */
  fun add(element: T) {
    val success = set.applyOperation(createAddOp(element))
    check(success) { "Failed to add element '$element' to CrdtSet." }
  }

  /** Removes [element] from the set. */
  fun remove(element: ReferenceId) {
    val success = set.applyOperation(createRemoveOp(element))
    check(success) { "Failed to remove element '$element' from CrdtSet." }
  }

  /** Clears all elements from the set. */
  fun clear() {
    val success = set.applyOperation(createClearOp())
    check(success) { "Failed to clear CrdtSet." }
  }

  private fun createAddOp(element: T): CrdtSet.Operation.Add<T> {
    versionMap.increment(actor)
    return CrdtSet.Operation.Add(actor, versionMap, element)
  }

  private fun createRemoveOp(element: ReferenceId): CrdtSet.Operation.Remove<T> {
    // Don't increment version map for removals.
    return CrdtSet.Operation.Remove(actor, versionMap, element)
  }

  private fun createClearOp(): CrdtSet.Operation.Clear<T> {
    // Don't increment version map for removals.
    return CrdtSet.Operation.Clear(actor, versionMap)
  }
}
