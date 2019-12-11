/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.data

import arcs.crdt.CrdtEntity
import arcs.crdt.CrdtModel
import arcs.crdt.CrdtModelType
import arcs.type.Tag
import arcs.type.Type
import arcs.type.TypeFactory
import arcs.type.TypeLiteral

/** [Type] representation of an entity. */
data class EntityType(override val entitySchema: Schema) :
    Type,
    EntitySchemaProviderType,
    CrdtModelType<CrdtEntity.Data, CrdtEntity.Operation, RawEntity> {

    override val tag = Tag.Entity

    constructor(names: List<SchemaName>, fields: SchemaFields, description: SchemaDescription) :
        this(Schema(names, fields, description))

    override fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type =
        variableMap[entitySchema] as? Type
            ?: EntityType(entitySchema).also { variableMap[entitySchema] = it }

    override fun createCrdtModel(): CrdtModel<CrdtEntity.Data, CrdtEntity.Operation, RawEntity> =
        entitySchema.createCrdtEntityModel()

    override fun toLiteral() = Literal(tag, entitySchema.toLiteral())

    override fun toString(options: Type.ToStringOptions): String {
        return entitySchema.description.pattern
            ?: entitySchema.name?.toPrettyString()
            ?: entitySchema.toLiteral().toJson()
    }

    /** Serialization-friendly [TypeLiteral] for [EntityType]. */
    data class Literal(override val tag: Tag, override val data: Schema.Literal) : TypeLiteral

    companion object {
        init {
            TypeFactory.registerBuilder(Tag.Entity) { literal ->
                EntityType(Schema.fromLiteral(literal.data))
            }
        }
    }
}
