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

import arcs.core.data.Plan
import arcs.core.host.api.Particle
import kotlin.reflect.KClass

/**
 * [KClass.java] and [KClass.qualifiedName] are not accessible in JS, which means they cannot be
 * used in shared code. This is a multiplatform workaround that uses toString() to obtain the
 * internal class name and replaces inner-class '$' separators with '.'.
 *
 * TODO: replace with official mechanisms once Kotlin Multiplatform's Kotlin-Reflect improves.
 */
fun KClass<*>.className(): String {
    // format is "interface|class|enum foo.bar.Bar$Inner<Type> (error messages)"
    return this.toString()
        .substringAfter(' ')
        .substringBefore(' ')
        .substringBefore('<')
        .replace('$', '.')
}

/** Returns a pair mapping [ParticleIdentifier] to [ParticleConstructor] */
inline fun <reified T : Particle> (() -> T).toRegistration(): ParticleRegistration {
    val construct: suspend (Plan.Particle?) -> T = { _ -> this.invoke() }
    return T::class.toParticleIdentifier() to construct
}

/** Returns a pair mapping [ParticleIdentifier] to [ParticleConstructor] */
inline fun <reified T : Particle> ((Plan.Particle?) -> T).toRegistration(): ParticleRegistration {
    val construct: suspend (Plan.Particle?) -> T = { this.invoke(it) }
    return T::class.toParticleIdentifier() to construct
}
