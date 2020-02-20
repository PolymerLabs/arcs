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
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtModelType
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSet.Data
import arcs.core.crdt.CrdtSet.IOperation
import arcs.core.type.Tag
import arcs.core.type.Type
import arcs.core.type.TypeFactory
import arcs.core.type.TypeLiteral
import kotlin.reflect.KClass

/** Extension function to wrap any type in a collection type. */
fun <T : Type> T?.collectionOf(): CollectionType<T>? =
    if (this == null) null else CollectionType(this)

/** [Type] representation of a collection. */
data class CollectionType<T : Type>(
    val collectionType: T
) : Type,
    Type.TypeContainer<T>,
    Type.TypeVariableMerger,
    EntitySchemaProviderType,
    CrdtModelType<Data<Referencable>, IOperation<Referencable>, Set<Referencable>> {

    override val tag = Tag.Collection
    override val containedType: T
        get() = collectionType
    override val entitySchema: Schema?
        get() = (collectionType as? EntitySchemaProviderType)?.entitySchema
    override val canEnsureResolved: Boolean
        get() = collectionType.canEnsureResolved
    override val resolvedType: CollectionType<*>?
        get() {
            val collectionResolvedType = collectionType.resolvedType
            return if (collectionResolvedType !== collectionType) {
                collectionResolvedType.collectionOf()
            } else this
        }

    override val crdtModelDataClass: KClass<*> = CrdtSet.DataImpl::class

    override fun maybeEnsureResolved(): Boolean = collectionType.maybeEnsureResolved()

    @Suppress("UNCHECKED_CAST")
    override fun mergeTypeVariablesByName(variableMap: MutableMap<Any, Any>): CollectionType<*> {
        val collectionType = this.collectionType
        val result =
            (collectionType as? Type.TypeVariableMerger)?.mergeTypeVariablesByName(variableMap)

        return if (result !== collectionType && result != null) {
            requireNotNull(result.collectionOf())
        } else this
    }

    override fun createCrdtModel():
        CrdtModel<Data<Referencable>, IOperation<Referencable>, Set<Referencable>> {
        return CrdtSet()
    }

    override fun copy(variableMap: MutableMap<Any, Any>): Type =
        TypeFactory.getType(Literal(tag, collectionType.copy(variableMap).toLiteral()))

    override fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type =
        CollectionType(collectionType.copyWithResolutions(variableMap))

    override fun toLiteral(): TypeLiteral = Literal(tag, collectionType.toLiteral())

    override fun toString(options: Type.ToStringOptions): String {
        return if (options.pretty) {
            "${collectionType.toString(options)} Collection"
        } else {
            "[${collectionType.toString(options)}]"
        }
    }

    /** [Literal] representation of a [CollectionType]. */
    data class Literal(override val tag: Tag, override val data: TypeLiteral) : TypeLiteral

    companion object {
        init {
            TypeFactory.registerBuilder(Tag.Collection) { literal ->
                CollectionType(TypeFactory.getType(literal.data))
            }
        }
    }
}
