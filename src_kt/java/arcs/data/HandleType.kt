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

/** [Type] representation of a handle. */
class HandleType : Type {
  override val tag = Tag.Handle
  override fun toLiteral() = Literal(tag)

  /** Literal representation of a [HandleType]. */
  data class Literal(override val tag: Tag) : TypeLiteral

  companion object {
    init {
      TypeFactory.registerBuilder(Tag.Handle) { HandleType() }
    }
  }
}
