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

package arcs.core.data

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtModelType
import arcs.core.type.Tag
import arcs.core.type.Type
import arcs.core.type.TypeFactory
import arcs.core.type.TypeLiteral
import kotlin.reflect.KClass

/** [Type] representation of an entity. */
data class EntityType(override val entitySchema: Schema) :
    Type,
    EntitySchemaProviderType,
    CrdtModelType<CrdtEntity.Data, CrdtEntity.Operation, RawEntity> {

    override val tag = Tag.Entity

    override val crdtModelDataClass: KClass<*> = CrdtEntity.Data::class

    override fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type =
        variableMap[entitySchema] as? Type
            ?: EntityType(entitySchema).also { variableMap[entitySchema] = it }

    override fun createCrdtModel(): CrdtModel<CrdtEntity.Data, CrdtEntity.Operation, RawEntity> =
        entitySchema.createCrdtEntityModel()

    override fun toLiteral() = Literal(tag, entitySchema.toLiteral())

    override fun toString(options: Type.ToStringOptions): String {
        return entitySchema.name?.toPrettyString()
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
