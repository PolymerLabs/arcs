package arcs.core.entity

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaRegistry
import arcs.core.storage.ActivationFactory
import arcs.core.storage.Dereferencer
import arcs.core.storage.RawEntityDereferencer
import arcs.core.storage.Reference

/** A [Dereferencer.Factory] for [Reference] and [RawEntity] classes. */
class EntityDereferencerFactory(
    private val entityActivationFactory: ActivationFactory? = null
) : Dereferencer.Factory<RawEntity> {
    private val dereferencers = mutableMapOf<Schema, RawEntityDereferencer>()

    override fun create(schema: Schema) = dereferencers.getOrPut(schema) {
        RawEntityDereferencer(
            schema,
            entityActivationFactory,
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
            is RawEntity -> injectDereferencers(schema, value)
            is Set<*> -> value.forEach { injectDereferencers(schema, it) }
        }
    }

    private fun injectDereferencers(schema: Schema, rawEntity: RawEntity) {
        fun injectField(fieldType: FieldType?, fieldValue: Any?) {
            if (fieldType is FieldType.EntityRef) {
                val fieldSchema = SchemaRegistry.getSchema(fieldType.schemaHash)
                injectDereferencers(fieldSchema, fieldValue)
            }
        }
        rawEntity.singletons.forEach { (field, value) ->
            injectField(schema.fields.singletons[field], value)
        }
        rawEntity.collections.forEach { (field, value) ->
            injectField(schema.fields.collections[field], value)
        }
    }
}
