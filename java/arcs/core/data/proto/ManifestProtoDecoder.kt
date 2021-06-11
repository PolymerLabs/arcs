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

/** Extracts [Recipe]s from the [ManifestProto]. */
fun ManifestProto.decodeRecipes(): List<Recipe> {
  val particleSpecs = decodeParticleSpecs().associateBy { it.name }
  return recipesList.map { it.decode(particleSpecs) }
}

/** Extracts [ParticleSpec]s from the [ManifestProto]. */
fun ManifestProto.decodeParticleSpecs() = particleSpecsList.map { it.decode() }

/** Convert a series of [Recipe]s into a [ManifestProto]. */
fun Collection<Recipe>.encodeManifest(): ManifestProto = ManifestProto.newBuilder()
  .addAllParticleSpecs(
    this.flatMap { it.particles.map { particle -> particle.spec } }
      .map { it.encode() }
  )
  .addAllRecipes(this.map { it.encode() })
  .build()
