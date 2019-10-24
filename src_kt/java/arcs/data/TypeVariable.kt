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
  : Type, Type.TypeVariableMerger, Type.CanReadWriteHolder, EntitySchemaProviderType {

  override val tag = Tag.TypeVariable
  override val resolvedType: Type?
    get() = variable.resolution ?: this
  override val canEnsureResolved: Boolean
    get() = variable.canEnsureResolved
  override val canReadSubset: Type?
    get() = variable.canReadSubset
  override val canWriteSuperset: Type?
    get() = variable.canWriteSuperset
  override val entitySchema: Schema?
    get() = (resolvedType as? EntitySchemaProviderType)?.entitySchema

  constructor(name: String, canWriteSuperset: Type? = null, canReadSubset: Type? = null) :
    this(TypeVariableInfo(name, canWriteSuperset, canReadSubset))

  override fun maybeEnsureResolved() = variable.maybeEnsureResolved()

  override fun mergeTypeVariablesByName(variableMap: MutableMap<Any, Any>): Type {
    var variable = variableMap[variable.name] as? Type
    if (variable == null) {
      variable = this
      variableMap[this.variable.name] = this
    } else if (variable is TypeVariable) {
      if (variable.variable.hasConstraint || this.variable.hasConstraint) {
        checkNotNull(variable.variable.maybeMergeConstraints(this.variable)) {
          "Could not merge type variables"
        }
      }
    }
    return variable
  }

  override fun copy(variableMap: MutableMap<Any, Any>): Type {
    (variableMap[variable.name] as? TypeVariableInfo)?.let { return TypeVariable(it) }

    val infoCopy = TypeVariableInfo.fromLiteral(variable.toLiteral())
    return TypeVariable(infoCopy).also { variableMap[variable.name] = infoCopy }
  }

  override fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type {
    val mapVariableInfo = variableMap[variable] as? TypeVariableInfo
    if (mapVariableInfo != null) return TypeVariable(mapVariableInfo)

    val copiedTypeVariableInfo =
      TypeVariableInfo.fromLiteral(variable.toLiteralIgnoringResolutions())

    variable.resolution?.let {
      copiedTypeVariableInfo.resolution = it.copyWithResolutions(variableMap)
    }
    variable.canReadSubset?.let {
      copiedTypeVariableInfo.canReadSubset = it.copyWithResolutions(variableMap)
    }
    variable.canWriteSuperset?.let {
      copiedTypeVariableInfo.canWriteSuperset = it.copyWithResolutions(variableMap)
    }
    variableMap[variable] = copiedTypeVariableInfo
    return TypeVariable(copiedTypeVariableInfo)
  }

  override fun toLiteral() =
    variable.resolution?.toLiteral() ?: Literal(tag, variable.toLiteral())

  override fun toString(options: Type.ToStringOptions): String {
    if (!options.pretty) return "~${variable.name}"
    return resolvedType?.toString(options) ?: "[~${variable.name}]"
  }

  /** [Literal] representation of a [TypeVariable]. */
  data class Literal(
    override val tag: Tag,
    override val data: TypeVariableInfo.Literal
  ) : TypeLiteral

  companion object {
    init {
      TypeFactory.registerBuilder(Tag.TypeVariable) { literal ->
        TypeVariable(TypeVariableInfo.fromLiteral(literal.data))
      }
    }
  }
}
