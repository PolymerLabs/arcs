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

package arcs.slot

import arcs.type.Tag
import arcs.type.Type
import arcs.type.TypeFactory
import arcs.type.TypeLiteral

/** [Type] representation of a slot. */
class SlotType(val slot: SlotInfo) : Type, Type.CanReadWriteHolder {
  override val tag = Tag.Slot
  override val canReadSubset: Type? = this
  override val canWriteSuperset: Type? = this

  constructor(formFactor: String, handle: String) : this(SlotInfo(formFactor, handle))

  // TODO: formFactor checking, etc.
  override fun isMoreSpecificThan(other: Type): Boolean = true

  override fun toLiteral() = Literal(tag, slot)

  override fun toString(options: Type.ToStringOptions): String {
    val fields = listOf("formFactor:${slot.formFactor}", "handle:${slot.handle}")
    return "Slot {${fields.joinToString()}}"
  }

  data class Literal(override val tag: Tag, override val data: SlotInfo) : TypeLiteral

  companion object {
    init {
      TypeFactory.registerBuilder(Tag.Slot) { literal ->
        SlotType(SlotInfo.fromLiteral(literal.data))
      }
    }
  }
}
