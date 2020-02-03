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

import arcs.core.sdk.Particle

/**
 * An [ParticleNotFoundException] is thrown if a [Particle] cannot be located in
 * any [ArcHost]s available on the [HostRegistry].
 */
class ParticleNotFoundException(spec: ParticleSpec) :
    Exception("""${spec.particleName} with location ${spec.location} cannot be found.""")
