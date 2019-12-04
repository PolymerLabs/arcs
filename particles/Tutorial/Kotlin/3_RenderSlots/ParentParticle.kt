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

import arcs.addressable.toAddress
import arcs.Particle
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class ParentParticle : Particle() {
    override fun getTemplate(slotName: String) = "<b>Hello:</b><div slotId=\"mySlot\"></div>"
}

@Retain
@ExportForCppRuntime()
fun _newParentParticle() = ParentParticle().toAddress()
