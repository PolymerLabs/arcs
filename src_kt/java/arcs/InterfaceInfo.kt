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

import arcs.slot.Slot
import arcs.type.Tag
import arcs.type.Type
import arcs.type.TypeFactory
import arcs.type.TypeLiteral

/** TODO: Everything, maybe. */
class InterfaceInfo(
  val name: String,
  val handleConnections: List<HandleConnection>,
  val slots: List<Slot>
) {
  val resolvedType: Type? = null
  val canEnsureResolved: Boolean = false
  val canReadSubset: Type? = null
  val canWriteSuperset: Type? = null

  fun maybeEnsureResolved(): Boolean = false

  fun toLiteral() = Literal(name)

  fun copy(variableMap: Map<Any, Any>): InterfaceInfo {
    TODO("implement me")
  }

  fun copyWithResolutions(variableMap: MutableMap<Any, Any>): InterfaceInfo {
    TODO("implement me")
  }

  fun mergeTypeVariablesByName(variableMap: MutableMap<Any, Any>) {
    TODO("implement me")
  }

  fun isMoreSpecificThan(other: InterfaceInfo): Boolean {
    TODO("impelement me")
  }

  fun toPrettyString(): String {
    TODO("implement me")
  }

  data class Literal(val name: String) : arcs.common.Literal

  companion object {
    fun fromLiteral(literal: arcs.common.Literal): InterfaceInfo {
      val interfaceInfoLiteral =
        requireNotNull(literal as? Literal) { "Literal not supported: $literal" }

      return InterfaceInfo(interfaceInfoLiteral.name, emptyList(), emptyList())
    }
  }
}

class HandleConnection {
  // TODO: probably everything
}

/** Represents an interface. */
class InterfaceType(val interfaceInfo: InterfaceInfo)
  : Type, Type.TypeVariableMerger, Type.CanReadWriteHolder {
  override val tag = Tag.Interface
  override val resolvedType: Type?
    get() = interfaceInfo.resolvedType
  override val canEnsureResolved: Boolean
    get() = interfaceInfo.canEnsureResolved
  override val canReadSubset: Type?
    get() = interfaceInfo.canReadSubset
  override val canWriteSuperset: Type?
    get() = interfaceInfo.canWriteSuperset

  constructor(name: String, handleConnections: List<HandleConnection>, slots: List<Slot>)
    : this(InterfaceInfo(name, handleConnections, slots))

  override fun maybeEnsureResolved(): Boolean = interfaceInfo.maybeEnsureResolved()

  override fun isMoreSpecificThan(other: Type): Boolean {
    if (other !is InterfaceType) return true
    return interfaceInfo.isMoreSpecificThan(other.interfaceInfo)
  }

  override fun mergeTypeVariablesByName(variableMap: MutableMap<Any, Any>): Type {
    val infoCopy = interfaceInfo.copy(emptyMap())
    infoCopy.mergeTypeVariablesByName(variableMap)
    return InterfaceType(infoCopy)
  }

  override fun copy(variableMap: MutableMap<Any, Any>): Type =
    TypeFactory.getType(Literal(tag, interfaceInfo.copy(variableMap).toLiteral()))

  override fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type {
    return InterfaceType(interfaceInfo.copyWithResolutions(variableMap))
  }

  override fun toLiteral(): TypeLiteral = Literal(tag, interfaceInfo.toLiteral())

  override fun toString(options: Type.ToStringOptions): String =
    if (options.pretty) interfaceInfo.toPrettyString() else interfaceInfo.name

  /** Literal representation of an [InterfaceType]. */
  data class Literal(override val tag: Tag, override val data: InterfaceInfo.Literal) : TypeLiteral

  companion object {
    init {
      TypeFactory.registerBuilder(Tag.Interface) { literal ->
        InterfaceType(InterfaceInfo.fromLiteral(literal.data))
      }
    }
  }
}
