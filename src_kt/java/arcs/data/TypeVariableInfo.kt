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

import arcs.type.Type

/** Represents metadata required to serialize a type variable. (?) */
data class TypeVariableInfo(
  val name: String,
  var canWriteSuperset: Type? = null,
  var canReadSubset: Type? = null,
  val hasConstraint: Boolean = false,
  var resolution: Type? = null,
  val canEnsureResolved: Boolean = true
) {

  // TODO: change return type from Any? to a constraint class when we have one
  fun maybeMergeConstraints(other: TypeVariableInfo): Any? {
    TODO("implement me")
  }

  fun maybeEnsureResolved(): Boolean {
    TODO("Implement me")
  }

  fun toLiteral(): Literal = Literal(name)

  fun toLiteralIgnoringResolutions(): Literal = Literal(name)

  data class Literal(val name: String) : arcs.common.Literal //  More stuff?

  companion object {
    fun fromLiteral(literal: arcs.common.Literal): TypeVariableInfo {
      if (literal !is Literal) throw IllegalArgumentException("TypeVariableInfo.Literal required")

      TODO("Implement me.")
    }
  }
}
