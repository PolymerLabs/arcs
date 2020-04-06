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
package arcs.core.host

/**
 * [ExternalHost] is the base class for all Platform-specific non-isolated hosts.
 * Just a place holder for now, but serves as a marker for the [arcs.core.allocator.Allocator]
 * in the future, and likely to house Android or Browser specific state, like application
 * context or browser global scope.
 */
abstract class ExternalHost(
    vararg externalParticles: ParticleRegistration
) : AbstractArcHost(*externalParticles)
