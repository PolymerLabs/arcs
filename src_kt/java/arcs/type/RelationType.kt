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

package arcs.type

import arcs.common.LiteralList

/** [Type] representation of a relation. */
class RelationType(private val relationEntities: List<Type>) : Type {
  override val tag = Tag.Relation

  override fun toLiteral() = Literal(tag, LiteralList(relationEntities.map { it.toLiteral() }))

  override fun toString(options: Type.ToStringOptions): String {
    return if (options.pretty) {
      relationEntities.joinToString(prefix = "[", postfix = "]") {
        it.toString(Type.ToStringOptions(pretty = true))
      }
    } else {
      tag.toString()
    }
  }

  /** Literal representation of a [RelationType]. */
  data class Literal(
    override val tag: Tag,
    override val data: LiteralList<TypeLiteral>
  ) : TypeLiteral

  companion object {
    init {
      TypeFactory.registerBuilder(Tag.Relation) { literal ->
        val literalList = literal.data as LiteralList<*>
        RelationType(literalList.map { TypeFactory.getType(it) })
      }
    }
  }
}
