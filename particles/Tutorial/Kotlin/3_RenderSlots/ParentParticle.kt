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

package arcs.tutorials

/**
 * Sample WASM Particle.
 */
class ParentParticle : AbstractParentParticle() {
  override fun getTemplate(slotName: String) = "<b>Hello:</b><div slotId=\"mySlot\"></div>"
}
