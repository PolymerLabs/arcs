package arcs.core.crdt.testing

import arcs.core.common.ReferenceId
import arcs.core.crdt.Actor
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtEntity.Operation
import arcs.core.data.FieldName

/**
 * Helper for interacting with a [CrdtEntity] in tests. Provides convenience methods for
 * constructing CRDT operations and sending them to the [entity]. Manages the [VersionMap]
 * incrementing so that you don't have to.
 */
class CrdtEntityHelper(private val actor: Actor, private val entity: CrdtEntity) {

  /** Set the given singleton [field] to [value]. */
  fun update(field: FieldName, value: CrdtEntity.Reference) {
    val op = Operation.SetSingleton(actor, entity.versionMap.increment(actor), field, value)
    applyOp(op) { "Failed to set singleton field '$field' to '$value'." }
  }

  /** Clears the value of the given singleton [field]. */
  fun clearSingleton(field: FieldName) {
    val op = Operation.ClearSingleton(actor, entity.versionMap, field)
    applyOp(op) { "Failed to clear singleton field '$field'." }
  }

  /** Adds [element] to the given collection [field]. */
  fun add(field: FieldName, element: CrdtEntity.Reference) {
    val op = Operation.AddToSet(actor, entity.versionMap.increment(actor), field, element)
    applyOp(op) { "Failed to add element '$element' to collection field '$field'." }
  }

  /** Removes [element] from the given collection [field]. */
  fun remove(field: FieldName, element: ReferenceId) {
    val op = Operation.RemoveFromSet(actor, entity.versionMap, field, element)
    applyOp(op) { "Failed to remove element '$element' from collection field '$field'." }
  }

  /** Clears everything from the [CrdtEntity]; all fields and metadata. */
  fun clearAll() {
    val op = Operation.ClearAll(actor, entity.versionMap)
    applyOp(op) { "Failed to clear everything from CrdtEntity." }
  }

  private fun applyOp(op: Operation, errorMessage: () -> String) {
    val success = entity.applyOperation(op)
    check(success) {
      """
      ${errorMessage()}
      Operation: $op
      CrdtEntity: ${entity.data}
      """.trimIndent()
    }
  }
}
