/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.data

import arcs.core.type.Tag
import arcs.core.type.Type

/**
 * [Type] representation for a type variable.
 *
 * The [constraint] reflects a specification by the particle author, not by type inference.
 * The [maxAccess] flag indicates if the type variable should accept all resolved constraints (i.e.
 * `with {*}`).
 */
data class TypeVariable(
  val name: String,
  val constraint: Type? = null,
  val maxAccess: Boolean = false
) : Type {
  override val tag = Tag.TypeVariable

  override fun toStringWithOptions(options: Type.ToStringOptions) = "~$name"
}
