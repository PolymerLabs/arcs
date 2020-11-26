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

package arcs.core.data

import arcs.core.type.Tag
import arcs.core.type.Type

/** [Type] representation of a reference. */
data class ReferenceType<T : Type>(private val referredType: T) :
  Type, Type.TypeContainer<T>, EntitySchemaProviderType {
  override val tag = Tag.Reference

  override val containedType: T = referredType

  override val entitySchema: Schema?
    get() = (containedType as? EntitySchemaProviderType)?.entitySchema

  override fun toString() = "&$containedType"

  override fun toStringWithOptions(options: Type.ToStringOptions): String =
    "&${containedType.toStringWithOptions(options)}"
}
