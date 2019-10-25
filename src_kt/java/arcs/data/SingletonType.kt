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

import arcs.common.Referencable
import arcs.crdt.CrdtModelType
import arcs.crdt.CrdtSingleton
import arcs.type.Tag
import arcs.type.Type
import arcs.type.TypeFactory
import arcs.type.TypeLiteral

/** [Type] representation for a singleton. */
class SingletonType<T : Type>(override val containedType: T) :
  Type,
  Type.TypeContainer<T>,
  CrdtModelType<
    CrdtSingleton.Data<Referencable>,
    CrdtSingleton.Operation<Referencable>,
    Referencable?> {
  override val tag = Tag.Singleton

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
