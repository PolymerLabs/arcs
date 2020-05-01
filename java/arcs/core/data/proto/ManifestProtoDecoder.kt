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

import arcs.core.data.Recipe
import arcs.core.util.Result

/** Extracts [Recipe]s from the [ManifestProto]. */
fun ManifestProto.decodeRecipes(): List<Recipe> {
    val particleSpecs = decodeParticleSpecs().associateBy { it.name }
    return recipesList.map { it.decode(particleSpecs) }
}

/** Extracts [ParticleSpec]s from the [ManifestProto]. */
fun ManifestProto.decodeParticleSpecs() = particleSpecsList.map {
    when (val result = it.decode()) {
        is Result.Ok -> result.value
        is Result.Err -> throw result.thrown
    }
}
