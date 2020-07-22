package arcs.core.entity

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.ReferencableList
import arcs.core.storage.ActivationFactory
import arcs.core.storage.Dereferencer
import arcs.core.storage.RawEntityDereferencer
import arcs.core.storage.Reference
import kotlinx.coroutines.ExperimentalCoroutinesApi

/** A [Dereferencer.Factory] for [Reference] and [RawEntity] classes. */
@ExperimentalCoroutinesApi
class EntityDereferencerFactory(
    private val activationFactory: ActivationFactory
) : Dereferencer.Factory<RawEntity> {
    private val dereferencers = mutableMapOf<Schema, RawEntityDereferencer>()

    override fun create(schema: Schema) = dereferencers.getOrPut(schema) {
        RawEntityDereferencer(
            schema,
            activationFactory,
            ::injectDereferencers
        )
    }

    /**
     * Recursively inject the [Dereferencer] into any [Reference]s in the receiving object.
     */
    override fun injectDereferencers(schema: Schema, value: Any?) {
        if (value == null) return
        when (value) {
            is Reference -> value.dereferencer = create(schema)
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
