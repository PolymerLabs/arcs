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

import kotlin.reflect.KClass

/**
 * A [ParticleIdentifier] is a multiplatform identifier for a [Particle] implementation.
 *
 * @property id the unique identifier for this particle implementation (usually qualified classname)
 */
data class ParticleIdentifier(val id: String) {
    companion object {
        /** Converts to JVM canonical class name format. */
        fun from(location: String) = ParticleIdentifier(location.replace('/', '.'))
    }
}

/** Creates a [ParticleIdenfifier] from a [KClass] */
fun KClass<out Particle>.toParticleIdentifier() = ParticleIdentifier.from(className())
