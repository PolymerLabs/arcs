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
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.RawEntity
import arcs.core.data.RawEntity.Companion.NO_REFERENCE_ID
import arcs.core.data.Schema
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import kotlin.reflect.KProperty

open class EntityBase(
    private val entityClassName: String,
    private val schema: Schema
) : Entity {
    // Private var _entityId with public getter. Only this class can set this field.
    private var _entityId: String? = null
    override val entityId: String?
        get() = _entityId

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
    public fun getSingletonValue(field: String): Any? = if (field in singletons) {
        singletons[field]
    } else {
        throw InvalidFieldNameException(entityClassName, field, isCollection = false)
    }

    /** Returns the value for the given collection field. */
    public fun getCollectionValue(field: String): Set<Any> = collections.getOrElse(field) {
        throw InvalidFieldNameException(entityClassName, field, isCollection = true)
    }

    /** Sets the value for the given singleton field. */
    public fun setSingletonValue(field: String, value: Any?) {
        val expectedType = getSingletonType(field)
        checkType(field, value, expectedType)
        singletons[field] = value
    }

    /** Sets the value for the given collection field. */
    public fun setCollectionValue(field: String, values: Set<Any>) {
        val expectedType = getCollectionType(field)
        values.forEach { checkType(field, it, expectedType) }
        collections[field] = values
    }

    /** Returns the [FieldType] for the given singleton field. */
    private fun getSingletonType(field: String) = schema.fields.singletons[field]
        ?: throw InvalidFieldNameException(entityClassName, field, isCollection = false)

    /** Returns the [FieldType] for the given collection field. */
    private fun getCollectionType(field: String) = schema.fields.collections[field]
        ?: throw InvalidFieldNameException(entityClassName, field, isCollection = true)

    /** Checks that the given value is of the expected type. */
    private fun checkType(field: String, value: Any?, type: FieldType) {
        if (value == null) {
            // Null values always pass.
            return
        }

        return when (type) {
            is FieldType.Primitive -> when (type.primitiveType) {
                PrimitiveType.Boolean -> require(value is Boolean) {
                    "Expected Boolean for $entityClassName.$field, but received $value."
                }
                PrimitiveType.Number -> require(value is Double) {
                    "Expected Double for $entityClassName.$field, but received $value."
                }
                PrimitiveType.Text -> require(value is String) {
                    "Expected String for $entityClassName.$field, but received $value."
                }
            }
            is FieldType.EntityRef -> {
                require(value is Reference<*>) {
                    "Expected Reference for $entityClassName.$field, but received $value."
                }
                require(value.schemaHash == type.schemaHash) {
                    "Expected Reference type to have schema hash ${type.schemaHash} but had " +
                        "schema hash ${value.schemaHash}."
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

    override fun serialize() = RawEntity(
        id = entityId ?: NO_REFERENCE_ID,
        singletons = singletons.mapValues { (field, value) ->
            value?.let { toReferencable(it, getSingletonType(field)) }
        },
        collections = collections.mapValues { (field, values) ->
            val type = getCollectionType(field)
            values.map { toReferencable(it, type) }.toSet()
        }
    )

    /**
     * Populates the entity from the given [RawEntity] serialization. Must only be called on a
     * fresh, empty instance.
     */
    public fun deserialize(rawEntity: RawEntity) {
        _entityId = if (rawEntity.id == NO_REFERENCE_ID) null else rawEntity.id
        rawEntity.singletons.forEach { (field, value) ->
            setSingletonValue(field, value?.let { fromReferencable(it, getSingletonType(field)) })
        }
        rawEntity.collections.forEach { (field, values) ->
            val type = getCollectionType(field)
            setCollectionValue(field, values.map { fromReferencable(it, type) }.toSet())
        }
    }

    override fun ensureIdentified(idGenerator: Id.Generator, handleName: String) {
        if (_entityId == null) {
            _entityId = idGenerator.newChildId(
                // TODO: should we allow this to be plumbed through?
                idGenerator.newArcId("dummy-arc"),
                handleName
            ).toString()
        }
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is EntityBase) return false
        if (entityClassName != other.entityClassName) return false
        if (schema != other.schema) return false
        if (_entityId != other._entityId) return false
        if (singletons != other.singletons) return false
        if (collections != other.collections) return false
        return true
    }

    override fun hashCode(): Int {
        var result = entityClassName.hashCode()
        result = 31 * result + schema.hashCode()
        result = 31 * result + _entityId.hashCode()
        result = 31 * result + singletons.hashCode()
        result = 31 * result + collections.hashCode()
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
    init { SchemaRegistry.register(this) }
    override fun deserialize(data: RawEntity): EntityBase =
        EntityBase("EntityBase", SCHEMA).apply { deserialize(data) }
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
    }
    is FieldType.EntityRef -> (value as Reference<*>).toReferencable()
}

private fun fromReferencable(referencable: Referencable, type: FieldType): Any = when (type) {
    is FieldType.Primitive -> {
        require(referencable is ReferencablePrimitive<*>) {
            "Expected ReferencablePrimitive but was $referencable."
        }
        requireNotNull(referencable.value) {
            "ReferencablePrimitive encoded an unexpected null value."
        }
    }
    is FieldType.EntityRef -> Reference.fromReferencable(referencable, type.schemaHash)
}
