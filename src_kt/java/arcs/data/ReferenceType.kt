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

import arcs.type.Tag
import arcs.type.Type
import arcs.type.TypeFactory
import arcs.type.TypeLiteral

/** [Type] representation of a reference. */
data class ReferenceType<T : Type>(private val referredType: T) :
    Type, Type.TypeContainer<T>, EntitySchemaProviderType {
    override val tag = Tag.Reference
    override val containedType: T = referredType
    override val canEnsureResolved: Boolean
        get() = containedType.canEnsureResolved
    override val entitySchema: Schema?
        get() = (containedType as? EntitySchemaProviderType)?.entitySchema
    override val resolvedType: Type?
        get() {
            val resolvedContainedType = containedType.resolvedType
            return if (resolvedContainedType != null && containedType != resolvedContainedType) {
                ReferenceType(resolvedContainedType)
            } else {
                this
            }
        }

    override fun maybeEnsureResolved() = containedType.maybeEnsureResolved()

    override fun copy(variableMap: MutableMap<Any, Any>): Type =
        TypeFactory.getType(Literal(tag, containedType.copy(variableMap).toLiteral()))

    override fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type =
        ReferenceType(containedType.copyWithResolutions(variableMap))

    override fun toLiteral() = Literal(tag, containedType.toLiteral())

    override fun toString() = "Reference<$containedType>"

    override fun toString(options: Type.ToStringOptions): String =
        "Reference<${containedType.toString(options)}>"

    data class Literal(override val tag: Tag, override val data: TypeLiteral) : TypeLiteral

    companion object {
        init {
            TypeFactory.registerBuilder(Tag.Reference) { literal ->
                ReferenceType(TypeFactory.getType(literal.data))
            }
        }
    }
}
