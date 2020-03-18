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

package arcs.core.data.proto

import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe

/** Converts a [RecipeProto] into [Recipe]. */
fun RecipeProto.decode(particleSpecs: Map<String, ParticleSpec>): Recipe {
    val recipeHandles = mutableMapOf<String, Recipe.Handle>()
    handlesList.forEach {
        val oldValue = recipeHandles.put(it.name, it.decode())
        require(oldValue == null) {
            "Duplicate handle '${it.name}' when decoding recipe '$name'."
        }
    }
    val context = DecodingContext(particleSpecs, recipeHandles)
    val particles = particlesList.map { it.decode(context) }
    return Recipe(name, recipeHandles, particles)
}
