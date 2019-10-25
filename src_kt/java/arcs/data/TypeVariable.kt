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

/** [Type] representation of a type variable. */
class TypeVariable(val variable: TypeVariableInfo)
  : Type, Type.TypeVariableMerger, EntitySchemaProviderType {

  override val tag = Tag.TypeVariable
  override val resolvedType: Type?
    get() = variable.resolution ?: this
  override val canEnsureResolved: Boolean
    get() = variable.canEnsureResolved
  override val entitySchema: Schema?
    get() = (resolvedType as? EntitySchemaProviderType)?.entitySchema

  constructor(name: String) : this(TypeVariableInfo(name))

  override fun mergeTypeVariablesByName(variableMap: MutableMap<Any, Any>): Type {
    var variable = variableMap[variable.name] as? Type
    if (variable == null) {
      variable = this
      variableMap[this.variable.name] = this
    }
    return variable
  }

  override fun copy(variableMap: MutableMap<Any, Any>): Type {
    (variableMap[variable.name] as? TypeVariableInfo)?.let { return TypeVariable(it) }

    val infoCopy = variable.copy()
    return TypeVariable(infoCopy).also { variableMap[variable.name] = infoCopy }
  }

  override fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type {
    val mapVariableInfo = variableMap[variable] as? TypeVariableInfo
    if (mapVariableInfo != null) return TypeVariable(mapVariableInfo)

    val copiedTypeVariableInfo = variable.copy()

    variable.resolution?.let {
      copiedTypeVariableInfo.resolution = it.copyWithResolutions(variableMap)
    }
    variableMap[variable] = copiedTypeVariableInfo
    return TypeVariable(copiedTypeVariableInfo)
  }

  override fun toLiteral() =
    variable.resolution?.toLiteral() ?: Literal(tag, variable.copy())

  override fun toString(options: Type.ToStringOptions): String {
    if (!options.pretty) return "~${variable.name}"
    return resolvedType?.toString(options) ?: "[~${variable.name}]"
  }

  /** [Literal] representation of a [TypeVariable]. */
  data class Literal(
    override val tag: Tag,
    override val data: TypeVariableInfo
  ) : TypeLiteral

  companion object {
    init {
      TypeFactory.registerBuilder(Tag.TypeVariable) { literal ->
        TypeVariable(literal.data as TypeVariableInfo)
      }
    }
  }
}
