package arcs.core.entity

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.ReferencableList
import arcs.core.storage.Dereferencer
import arcs.core.storage.RawEntityDereferencer
import arcs.core.storage.RawReference
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.keys.ForeignStorageKey

/** A [Dereferencer.Factory] for [RawReference] and [RawEntity] classes. */
open class EntityDereferencerFactory(
  private val storageEndpointManager: StorageEndpointManager,
  private val foreignReferenceChecker: ForeignReferenceChecker
) : Dereferencer.Factory<RawEntity> {
  private val dereferencers = mutableMapOf<Schema, RawEntityDereferencer>()

  override fun create(schema: Schema) = dereferencers.getOrPut(schema) {
    RawEntityDereferencer(
      schema,
      storageEndpointManager,
      ::injectDereferencers
    )
  }

  /**
   * Recursively inject the [Dereferencer] into any [RawReference]s in the receiving object.
   */
  override fun injectDereferencers(schema: Schema, value: Any?) {
    if (value == null) return
    when (value) {
      is RawReference -> {
        if (value.storageKey is ForeignStorageKey) {
          value.dereferencer = ForeignEntityDereferencer(schema, foreignReferenceChecker)
        } else {
          value.dereferencer = create(schema)
        }
      }
      is RawEntity -> injectDereferencersIntoRawEntity(schema, value)
      is Set<*> -> value.forEach { injectDereferencers(schema, it) }
      is ReferencableList<*> -> value.value.forEach { injectDereferencers(schema, it) }
    }
  }

  private fun injectDereferencersIntoRawEntity(schema: Schema, rawEntity: RawEntity) {
    rawEntity.singletons.forEach { (field, value) ->
      injectField(schema.fields.singletons[field], value)
    }
    rawEntity.collections.forEach { (field, value) ->
      injectField(schema.fields.collections[field], value)
    }
  }

  private fun injectField(fieldType: FieldType?, fieldValue: Any?) {
    val schemaHash = when (fieldType) {
      is FieldType.EntityRef -> fieldType.schemaHash
      is FieldType.InlineEntity -> fieldType.schemaHash
      is FieldType.ListOf -> {
        injectField(fieldType.primitiveType, fieldValue)
        null
      }
      else -> null
    }
    schemaHash?.let {
      val fieldSchema = requireNotNull(
        SchemaRegistry.getSchema(it)
      ) {
        "Unknown schema with hash $it."
      }
      injectDereferencers(fieldSchema, fieldValue)
    }
  }
}

/**
 * A [Dereferencer] for foreign [RawReference]s. A foreign reference is a reference to something not
 * stored in Arcs. This Dereferencer checks with the [ForeignReferenceChecker] whether the given ID
 * is valid, if so it return an empty RawEntity with that ID, otherwise it returns null.
 */
class ForeignEntityDereferencer(
  private val schema: Schema,
  private val foreignReferenceChecker: ForeignReferenceChecker
) : Dereferencer<RawEntity> {
  override suspend fun dereference(rawReference: RawReference): RawEntity? {
    check(rawReference.storageKey is ForeignStorageKey) {
      "ForeignEntityDereferencer can only be used for foreign references."
    }
    val entityId = rawReference.id
    if (foreignReferenceChecker.check(schema, entityId)) {
      return RawEntity(id = entityId)
    }
    return null
  }

  override fun equals(other: Any?) = when (other) {
    is ForeignEntityDereferencer ->
      schema == other.schema && foreignReferenceChecker == other.foreignReferenceChecker
    else -> false
  }

  override fun hashCode(): Int {
    var result = schema.hashCode()
    result = 31 * result + foreignReferenceChecker.hashCode()
    return result
  }
}
