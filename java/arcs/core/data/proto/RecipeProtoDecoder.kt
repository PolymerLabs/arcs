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
    val decodeAndUpdate = { handleProto: HandleProto ->
        val oldValue = recipeHandles.put(handleProto.name, handleProto.decode(recipeHandles))
        require(oldValue == null) {
            "Duplicate handle '${handleProto.name}' when decoding recipe '$name'."
        }
    }

    handlesList
        .filter { it.fate.decode() != Recipe.Handle.Fate.JOIN }
        .forEach(decodeAndUpdate)

    handlesList
        .filter { it.fate.decode() == Recipe.Handle.Fate.JOIN }
        .forEach(decodeAndUpdate)

    val context = DecodingContext(particleSpecs, recipeHandles)
    val particles = particlesList.map { it.decode(context) }
    val annotations = annotationsList.map { it.decode() }
    return Recipe(name.ifBlank { null }, recipeHandles, particles, annotations)
}
