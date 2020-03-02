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
 * An ArcsHost that runs isolatable particles that are expected to have no platform
 * dependencies directly on Android APIs.
 */
abstract class ProdHost(
    vararg particles: ParticleRegistration
) : AbstractArcHost(*particles)
