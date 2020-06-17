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

package arcs.core.data

import arcs.core.type.Tag
import arcs.core.type.Type
import arcs.core.type.TypeLiteral

/** [Type] representation for a type variable. */
data class TypeVariable(val name: String, val constraint: Type? = null) : Type {
    override val tag = Tag.TypeVariable

    override fun toLiteral() = Literal(tag, VariableLiteral(name, constraint?.toLiteral()))

    override fun toString(options: Type.ToStringOptions) = "~$name"

    /** [Literal][arcs.core.common.Literal] representation of the variable. */
    data class VariableLiteral(
        val name: String,
        val constraint: arcs.core.common.Literal? = null
    ) : arcs.core.common.Literal

    /** [TypeLiteral] representation of a [TypeVariable]. */
    data class Literal(override val tag: Tag, override val data: VariableLiteral) : TypeLiteral
}
