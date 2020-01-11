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
package arcs.core.host

/**
 * A [Plan] is usually produced by running the build time Particle Accelerator tool, it consists
 * of a set of handles, particles, and connections between handles and particles used in a recipe.
 */
class Plan(
    handleSpecs: List<HandleSpec>,
    particleSpecs: List<ParticleSpec>,
    connections: List<HandleConnection>
)
