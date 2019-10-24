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

import arcs.common.Literal

/** Descriptor for a slot. */
data class SlotInfo(val formFactor: String, val handle: String) : Literal {
  companion object {
    /**
     * Converts the given literal to a [SlotInfo], throws IllegalArgumentException if this is not
     * possible.
     */
    fun fromLiteral(literal: Literal): SlotInfo =
      requireNotNull(literal as? SlotInfo) { "Literal is not a SlotInfo" }
  }
}
