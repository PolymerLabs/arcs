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

import arcs.core.data.expression.Expression
import arcs.core.type.Type

data class HandleConnectionSpec(
  val name: String,
  val direction: HandleMode,
  val type: Type,
  val expression: Expression<*>? = null
)
