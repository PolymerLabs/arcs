/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.entity

import arcs.core.common.Id
import arcs.core.common.Referencable
import arcs.core.data.Capability.Ttl
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.RawEntity
import arcs.core.data.RawEntity.Companion.NO_REFERENCE_ID
import arcs.core.data.RawEntity.Companion.UNINITIALIZED_TIMESTAMP
import arcs.core.data.Schema
import arcs.core.data.SchemaHash
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.storage.Reference as StorageReference
import arcs.core.util.ArcsDuration
import arcs.core.util.ArcsInstant
import arcs.core.util.BigInt
import arcs.core.util.Time
import kotlin.reflect.KProperty

open class EntityBase(
  private val entityClassName: String,
  private val schema: Schema,
  entityId: String? = null,
  creationTimestamp: Long = UNINITIALIZED_TIMESTAMP,
  expirationTimestamp: Long = UNINITIALIZED_TIMESTAMP,
  private val isInlineEntity: Boolean = false
) : Entity {
  /**
   * Only this class should be able to change these fields (in the [deserialize] and
   * [ensureEntityFields] methods). But we keep them visible so that it's possible to construct
   * mutated copies of the same entity.
   */
  final override var entityId: String? = entityId
    private set
  final override var creationTimestamp: Long = creationTimestamp
    private set
  final override var expirationTimestamp: Long = expirationTimestamp
    private set

  private val singletons: MutableMap<String, Any?> = mutableMapOf()
  private val collections: MutableMap<String, Set<Any>> = mutableMapOf()

  // Initialize all fields. After this point, if a key is not present in singletons/collections,
  // it will not be considered a valid field for the entity.
  init {
    reset()
  }

  /**
   * This is a convenience for exposing singleton entity fields conveniently in subclasses of
   * [EntityBase].
   *
   * It will delegate the getter/setter of the property to the `getSingletonValue` and
   * `setSingletonValue` methods.
   *
   * ```kotlin
   *   var myProperty: String by SingletonProperty()
   * ```
   */
  @Suppress("UNCHECKED_CAST")
  protected inner class SingletonProperty<T> {
    operator fun getValue(thisRef: Any?, property: KProperty<*>) =
      getSingletonValue(property.name) as T

    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: T) =
      setSingletonValue(property.name, value)
  }

  /**
   * This is a convenience for exposing collection entity fields conveniently in subclasses of
   * [EntityBase].
   *
   * It will delegate the getter/setter of the property to the `getCollectionValue` and
   * `setCollectionValue` methods.
   *
   * ```kotlin
   *   var myProperty: Set<String> by CollectionProperty()
   * ```
   */
  @Suppress("UNCHECKED_CAST")
  protected inner class CollectionProperty<T> {
    operator fun getValue(thisRef: Any?, property: KProperty<*>) =
      getCollectionValue(property.name) as Set<T>

    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: Set<T>) =
      setCollectionValue(property.name, value as Set<Any>)
  }

  /** Returns the value for the given singleton field. */
  fun getSingletonValue(field: String): Any? = if (field in singletons) {
    singletons[field]
  } else {
    throw InvalidFieldNameException(entityClassName, field, isCollection = false)
  }

  /** Returns the value for the given collection field. */
  fun getCollectionValue(field: String): Set<Any> = collections.getOrElse(field) {
    throw InvalidFieldNameException(entityClassName, field, isCollection = true)
  }

  /** Sets the value for the given singleton field. */
  fun setSingletonValue(field: String, value: Any?) {
    val expectedType = getSingletonType(field)
    checkType(field, value, expectedType)
    singletons[field] = value
  }

  /** Sets the value for the given collection field. */
  fun setCollectionValue(field: String, values: Set<Any>) {
    val expectedType = getCollectionType(field)
    values.forEach { checkType(field, it, expectedType) }
    collections[field] = values
  }

  /**
   * Returns the [FieldType] for the given singleton field.
   *
   * @throws InvalidFieldNameException if the field does not exist
   */
  private fun getSingletonType(field: String): FieldType {
    return getSingletonTypeOrNull(field)
      ?: throw InvalidFieldNameException(entityClassName, field, isCollection = false)
  }

  /** Returns the [FieldType] for the given singleton field, or null if it does not exist. */
  private fun getSingletonTypeOrNull(field: String) = schema.fields.singletons[field]

  /** Returns true if the singleton has the Field. */
  protected fun hasSingletonField(field: String) = getSingletonTypeOrNull(field) != null

  /**
   * Returns the [FieldType] for the given collection field.
   *
   * @throws InvalidFieldNameException if the field does not exist
   */
  private fun getCollectionType(field: String): FieldType {
    return getCollectionTypeOrNull(field)
      ?: throw InvalidFieldNameException(entityClassName, field, isCollection = true)
  }

  /** Returns the [FieldType] for the given collection field, or null if it does not exist. */
  private fun getCollectionTypeOrNull(field: String) = schema.fields.collections[field]

  /** Returns true if the collection has the Field. */
  protected fun hasCollectionField(field: String) = getCollectionTypeOrNull(field) != null

  /** Checks that the given value is of the expected type. */
  private fun checkType(field: String, value: Any?, type: FieldType, context: String = "") {
    if (value == null) {
      // Null values always pass.
      return
    }

    return when (type) {
      is FieldType.Primitive -> when (type.primitiveType) {
        PrimitiveType.Boolean -> require(value is Boolean) {
          "Expected Boolean for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.Number -> require(value is Double) {
          "Expected Double for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.Text -> require(value is String) {
          "Expected String for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.Byte -> require(value is Byte) {
          "Expected Byte for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.Short -> require(value is Short) {
          "Expected Short for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.Int -> require(value is Int) {
          "Expected Int for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.Long -> require(value is Long) {
          "Expected Long for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.Duration -> require(value is ArcsDuration) {
          "Expected Duration for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.Instant -> require(value is ArcsInstant) {
          "Expected Instant for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.Char -> require(value is Char) {
          "Expected Char for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.Float -> require(value is Float) {
          "Expected Float for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.Double -> require(value is Double) {
          "Expected Double for $context$entityClassName.$field, but received $value."
        }
        PrimitiveType.BigInt -> require(value is BigInt) {
          "Expected BigInt for $context$entityClassName.$field, but received $value."
        }
      }
      is FieldType.EntityRef -> {
        require(value is Reference<*>) {
          "Expected Reference for $context$entityClassName.$field, but received $value."
        }
        if (type.isHardReference) {
          value.setHardReference()
        }
        require(value.schemaHash == type.schemaHash) {
          "Expected Reference type to have schema hash ${type.schemaHash} but had " +
            "schema hash ${value.schemaHash}."
        }
      }
      is FieldType.Tuple -> {
        // TODO(b/156003617)
        throw NotImplementedError("[FieldType.Tuple]s are not supported.")
      }
      is FieldType.ListOf -> {
        require(value is List<*>) {
          "Expected list for $entityClassName.$field, but received $value."
        }
        value.forEach { checkType(field, it, type.primitiveType, "member of ") }
      }
      is FieldType.InlineEntity -> {
        require(value is EntityBase) {
          "Expected EntityBase for $context#entityClassName.$field, but received $value."
        }
        require(value.schema.hash == type.schemaHash) {
          "Expected EntityBase type to have schema hash ${type.schemaHash} but had " +
            "schema hash ${value.schema.hash}."
        }
      }
    }
  }

  /** Combines all singleton/collection field data into a single map. */
  private fun allFields(): Map<String, Any?> = mutableMapOf<String, Any?>().apply {
    putAll(singletons)
    putAll(collections)
  }

  final override fun reset() {
    schema.fields.singletons.keys.forEach { singletons[it] = null }
    schema.fields.collections.keys.forEach { collections[it] = emptySet() }
  }

  override fun serialize(storeSchema: Schema?): RawEntity {
    val serializationFields = storeSchema?.fields ?: schema.fields
    val serialization = RawEntity(
      id = entityId ?: NO_REFERENCE_ID,
      singletons = serializationFields.singletons.keys.intersect(
        schema.fields.singletons.keys
      ).map { field ->
        field to getSingletonValue(field)?.let {
          toReferencable(it, getSingletonType(field))
        }
      }.toMap(),
      collections = serializationFields.collections.keys.intersect(
        schema.fields.collections.keys
      ).map { field ->
        val type = getCollectionType(field)
        field to getCollectionValue(field).map { toReferencable(it, type) }.toSet()
      }.toMap(),
      creationTimestamp = creationTimestamp,
      expirationTimestamp = expirationTimestamp
    )
    /**
     * Inline entities should have value equality, but we use the id to determine
     * equality when adding entities to CRDT collections/singletons.
     */
    if (isInlineEntity) {
      return serialization.copy(id = serialization.hashCode().toString())
    }
    return serialization
  }

  /**
   * Populates the entity from the given [RawEntity] serialization. Must only be called on a
   * fresh, empty instance.
   *
   * Supports type slicing: fields that are not present in the [Schema] for this [Entity] will be
   * silently ignored.
   *
   * @param nestedEntitySpecs mapping from [SchemaHash] to [EntitySpec], used when dereferencing
   *     [Reference] fields inside the entity
   */
  open fun deserialize(
    rawEntity: RawEntity,
    nestedEntitySpecs: Map<SchemaHash, EntitySpec<out Entity>> = mapOf()
  ) {
    entityId = if (rawEntity.id == NO_REFERENCE_ID || isInlineEntity) null else rawEntity.id
    rawEntity.singletons.forEach { (field, value) ->
      getSingletonTypeOrNull(field)?.let { type ->
        setSingletonValue(
          field,
          value?.let { fromReferencable(it, type, nestedEntitySpecs) }
        )
      }
    }
    rawEntity.collections.forEach { (field, values) ->
      getCollectionTypeOrNull(field)?.let { type ->
        setCollectionValue(
          field,
          values.map { fromReferencable(it, type, nestedEntitySpecs) }.toSet()
        )
      }
    }
    creationTimestamp = rawEntity.creationTimestamp
    expirationTimestamp = rawEntity.expirationTimestamp
  }

  override fun ensureEntityFields(
    idGenerator: Id.Generator,
    handleName: String,
    time: Time,
    ttl: Ttl
  ) {
    if (entityId == null) {
      entityId = idGenerator.newChildId(Id.fromString(handleName)).toString()
    }
    val now = time.currentTimeMillis
    if (creationTimestamp == UNINITIALIZED_TIMESTAMP) {
      creationTimestamp = now
      if (ttl != Ttl.Infinite()) {
        expirationTimestamp = ttl.calculateExpiration(time)
      }
    }
    require(creationTimestamp <= now) {
      "Cannot set a future creationTimestamp=$creationTimestamp."
    }
  }

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (other !is EntityBase) return false
    if (entityClassName != other.entityClassName) return false
    if (schema != other.schema) return false
    if (entityId != other.entityId) return false
    if (singletons != other.singletons) return false
    if (collections != other.collections) return false
    if (creationTimestamp != other.creationTimestamp) return false
    if (expirationTimestamp != other.expirationTimestamp) return false
    return true
  }

  override fun hashCode(): Int {
    var result = entityClassName.hashCode()
    result = 31 * result + schema.hashCode()
    result = 31 * result + entityId.hashCode()
    result = 31 * result + singletons.hashCode()
    result = 31 * result + collections.hashCode()
    result = 31 * result + creationTimestamp.hashCode()
    result = 31 * result + expirationTimestamp.hashCode()
    return result
  }

  override fun toString(): String {
    val fields = allFields().entries
      .sortedBy { it.key }
      .joinToString(", ") { (field, value) ->
        "$field = $value"
      }
    return "$entityClassName($fields)"
  }
}

class EntityBaseSpec(
  override val SCHEMA: Schema
) : EntitySpec<EntityBase> {
  init {
    SchemaRegistry.register(SCHEMA)
  }

  override fun deserialize(data: RawEntity) = EntityBase("EntityBase", SCHEMA).apply {
    deserialize(data, mapOf(SCHEMA.hash to this@EntityBaseSpec))
  }

  fun deserialize(data: RawEntity, nestedEntitySpecs: Map<SchemaHash, EntitySpec<out Entity>>) =
    EntityBase("EntityBase", SCHEMA).apply { deserialize(data, nestedEntitySpecs) }
}

class InvalidFieldNameException(
  entityClassName: String,
  field: String,
  isCollection: Boolean
) : IllegalArgumentException(
  "$entityClassName does not have a ${if (isCollection) "collection" else "singleton"} field " +
    "called \"$field\"."
)

private fun toReferencable(value: Any, type: FieldType): Referencable = when (type) {
  is FieldType.Primitive -> when (type.primitiveType) {
    PrimitiveType.Boolean -> (value as Boolean).toReferencable()
    PrimitiveType.Number -> (value as Double).toReferencable()
    PrimitiveType.Text -> (value as String).toReferencable()
    PrimitiveType.Byte -> (value as Byte).toReferencable()
    PrimitiveType.Short -> (value as Short).toReferencable()
    PrimitiveType.Int -> (value as Int).toReferencable()
    PrimitiveType.Long -> (value as Long).toReferencable()
    PrimitiveType.Duration -> (value as ArcsDuration).toReferencable()
    PrimitiveType.Instant -> (value as ArcsInstant).toReferencable()
    PrimitiveType.Char -> (value as Char).toReferencable()
    PrimitiveType.Float -> (value as Float).toReferencable()
    PrimitiveType.Double -> (value as Double).toReferencable()
    PrimitiveType.BigInt -> (value as BigInt).toReferencable()
  }
  is FieldType.EntityRef -> (value as Reference<*>).toReferencable()
  // TODO(b/155025255)
  is FieldType.Tuple ->
    throw NotImplementedError("[FieldType.Tuple]s cannot be converted to references.")
  is FieldType.ListOf ->
    (value as List<*>).map {
      toReferencable(it!!, type.primitiveType)
    }.toReferencable(type)
  is FieldType.InlineEntity -> (value as EntityBase).serialize()
}

private fun fromReferencable(
  referencable: Referencable,
  type: FieldType,
  nestedEntitySpecs: Map<SchemaHash, EntitySpec<out Entity>>
): Any {
  return when (type) {
    is FieldType.Primitive -> {
      require(referencable is ReferencablePrimitive<*>) {
        "Expected ReferencablePrimitive but was $referencable."
      }
      requireNotNull(referencable.value) {
        "ReferencablePrimitive encoded an unexpected null value."
      }
    }
    is FieldType.EntityRef -> {
      require(referencable is StorageReference) {
        "Expected Reference but was $referencable."
      }
      val entitySpec = requireNotNull(nestedEntitySpecs[type.schemaHash]) {
        "Unknown schema with hash ${type.schemaHash}."
      }
      Reference(entitySpec, referencable)
    }
    // TODO(b/155025255)
    is FieldType.Tuple ->
      throw NotImplementedError("References cannot be converted [FieldType.Tuple]s.")
    is FieldType.ListOf -> {
      require(referencable is ReferencableList<*>) {
        "Expected ReferencableList but was $referencable."
      }
      requireNotNull(referencable.value) {
        "ReferencableList encoded an unexpected null value."
      }
      referencable.value.map { fromReferencable(it, type.primitiveType, nestedEntitySpecs) }
    }
    is FieldType.InlineEntity -> {
      require(referencable is RawEntity) {
        "Expected RawEntity but was $referencable."
      }
      val entitySpec = requireNotNull(nestedEntitySpecs[type.schemaHash]) {
        "Unknown schema with hash ${type.schemaHash}."
      }
      entitySpec.deserialize(referencable)
    }
  }
}
