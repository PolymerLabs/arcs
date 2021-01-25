package arcs.core.crdt.testing

import arcs.core.common.ReferenceId
import arcs.core.crdt.Actor
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldName

/**
 * Helper for interacting with a [CrdtEntity] in tests. Provides convenience methods for
 * constructing CRDT operations and sending them to the [entity]. Maintains its own internal CRDT
 * [VersionMap] instances so that you don't have to!
 */
class CrdtEntityHelper(private val actor: Actor, private val entity: CrdtEntity) {
  // Maintain a separate VersionMap for each field.
  private val singletonVersionMaps = mutableMapOf<String, VersionMap>()
  private val collectionVersionMaps = mutableMapOf<String, VersionMap>()

  /** Set the given singleton [field] to [value]. */
  fun update(field: FieldName, value: CrdtEntity.Reference) {
    val op = createSetSingletonOp(field, value)
    applyOp(op) { "Failed to set singleton field '$field' to '$value'." }
  }

  /** Clears the value of the given singleton [field]. */
  fun clearSingleton(field: FieldName) {
    val op = createClearSingletonOp(field)
    applyOp(op) { "Failed to clear singleton field '$field'." }
  }

  /** Adds [element] to the given collection [field]. */
  fun add(field: FieldName, element: CrdtEntity.Reference) {
    val op = createAddToSetOp(field, element)
    applyOp(op) { "Failed to add element '$element' to collection field '$field'." }
  }

  /** Removes [element] from the given collection [field]. */
  fun remove(field: FieldName, element: ReferenceId) {
    val op = createRemoveFromSetOp(field, element)
    applyOp(op) { "Failed to remove element '$element' from collection field '$field'." }
  }

  /** Clears everything from the [CrdtEntity]; all fields and metadata. */
  fun clearAll() {
    val op = createClearAllOp()
    applyOp(op) { "Failed to clear everything from CrdtEntity." }
  }

  private fun getSingletonVersionMap(field: FieldName): VersionMap {
    return singletonVersionMaps.getOrPut(field) { VersionMap() }
  }

  private fun getCollectionVersionMap(field: FieldName): VersionMap {
    return collectionVersionMaps.getOrPut(field) { VersionMap() }
  }

  private fun createSetSingletonOp(
    field: FieldName,
    value: CrdtEntity.Reference
  ): CrdtEntity.Operation.SetSingleton {
    val versionMap = getSingletonVersionMap(field).increment(actor)
    return CrdtEntity.Operation.SetSingleton(actor, versionMap.copy(), field, value)
  }

  private fun createClearSingletonOp(field: FieldName): CrdtEntity.Operation.ClearSingleton {
    // Don't increment version map for removals.
    val versionMap = getSingletonVersionMap(field)
    return CrdtEntity.Operation.ClearSingleton(actor, versionMap.copy(), field)
  }

  private fun createAddToSetOp(
    field: FieldName,
    element: CrdtEntity.Reference
  ): CrdtEntity.Operation.AddToSet {
    val versionMap = getCollectionVersionMap(field).increment(actor)
    return CrdtEntity.Operation.AddToSet(actor, versionMap.copy(), field, element)
  }

  private fun createRemoveFromSetOp(
    field: FieldName,
    element: ReferenceId
  ): CrdtEntity.Operation.RemoveFromSet {
    // Don't increment version map for removals.
    val versionMap = getCollectionVersionMap(field)
    return CrdtEntity.Operation.RemoveFromSet(actor, versionMap.copy(), field, element)
  }

  private fun createClearAllOp(): CrdtEntity.Operation.ClearAll {
    // TODO(b/175657591): ClearAll is broken; there's no good value to use for versionMap here.
    val versionMap = VersionMap()
    return CrdtEntity.Operation.ClearAll(actor, versionMap.copy())
  }

  private fun applyOp(op: CrdtEntity.Operation, errorMessage: () -> String) {
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
