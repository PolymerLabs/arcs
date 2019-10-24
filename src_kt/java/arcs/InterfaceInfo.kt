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

import arcs.type.Tag
import arcs.type.Type
import arcs.type.TypeLiteral

/** TODO: Everything, maybe. */
class InterfaceInfo(val name: String) {
  fun toLiteral() = Literal(name)

  fun copy(variableMap: Map<Any, Any>): InterfaceInfo {
    TODO("implement me")
  }

  data class Literal(val name: String) : arcs.common.Literal

  companion object {
    fun fromLiteral(literal: arcs.common.Literal): InterfaceInfo {
      val interfaceInfoLiteral =
        requireNotNull(literal as? Literal) { "Literal not supported: $literal" }

      return InterfaceInfo(interfaceInfoLiteral.name)
    }
  }
}

class InterfaceType(val interfaceInfo: InterfaceInfo) : Type {
  override val tag = Tag.Interface

  override fun toLiteral(): TypeLiteral = Literal(tag, interfaceInfo.toLiteral())

  data class Literal(override val tag: Tag, override val data: InterfaceInfo.Literal) : TypeLiteral
}
