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

import arcs.common.Literal
import arcs.type.Type

/** Represents metadata required to serialize a type variable. (?) */
data class TypeVariableInfo(
  val name: String,
  val hasConstraint: Boolean = false,
  var resolution: Type? = null,
  val canEnsureResolved: Boolean = true
) : Literal
