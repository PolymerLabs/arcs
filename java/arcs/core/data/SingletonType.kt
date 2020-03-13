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

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtModelType
import arcs.core.crdt.CrdtSingleton
import arcs.core.type.Tag
import arcs.core.type.Type
import arcs.core.type.TypeFactory
import arcs.core.type.TypeLiteral
import kotlin.reflect.KClass

/** [Type] representation for a singleton. */
data class SingletonType<T : Type>(override val containedType: T) :
    Type,
    Type.TypeContainer<T>,
    EntitySchemaProviderType,
    CrdtModelType<
        CrdtSingleton.Data<Referencable>,
        CrdtSingleton.IOperation<Referencable>,
        Referencable?> {
    override val tag = Tag.Singleton

    override val entitySchema: Schema? =
        (containedType as? EntitySchemaProviderType)?.entitySchema

    override val crdtModelDataClass: KClass<*> = CrdtSingleton.DataImpl::class

    override fun toLiteral() = Literal(tag, containedType.toLiteral())

    override fun createCrdtModel() = CrdtSingleton<Referencable>()

    data class Literal(override val tag: Tag, override val data: TypeLiteral) : TypeLiteral

    companion object {
        init {
            TypeFactory.registerBuilder(Tag.Singleton) { literal ->
                SingletonType(TypeFactory.getType(literal.data))
            }
        }
    }
}
