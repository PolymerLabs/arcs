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

package arcs

import arcs.common.ArcId
import arcs.common.Id
import arcs.type.Tag
import arcs.type.Type
import arcs.type.TypeFactory
import arcs.type.TypeLiteral

class Arc {
  // TODO: everything(?)
}

/** [Type] representation of an arc. */
class ArcType : Type {
  override val tag = Tag.Arc
  override fun toLiteral() = Literal(tag)

  fun newInstance(arcId: Id, serialization: String) = ArcInfo(arcId as ArcId, serialization)

  /** Literal representation of an [ArcType]. */
  data class Literal(override val tag: Tag) : TypeLiteral

  companion object {
    init {
      TypeFactory.registerBuilder(Tag.Arc) { ArcType() }
    }
  }
}

/**
 * Equivalent to an Entity with `Schema { serialization Text }`
 */
data class ArcInfo(val id: String, val serialization: String) {
  constructor(id: ArcId, serialization: String) : this("$id", sanitize(serialization))

  companion object {
    private val IMPORT_PATTERN = "\\bimport .*\n".toRegex(RegexOption.MULTILINE)

    // TODO: remove the import-removal hack when import statements no longer appear
    //   in serialized manifests, or deal with them correctly if they end up staying
    private fun sanitize(serialization: String): String = serialization.replace(IMPORT_PATTERN, "")
  }
}
