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

package arcs.sdk

typealias JvmEntity = arcs.jvm.storage.api.JvmEntity
typealias JvmEntitySpec<T> = arcs.jvm.storage.api.JvmEntitySpec<T>

/** Implementation of [Particle] for the JVM. */
abstract class BaseParticle : Particle {
    /**
     * This field contains a reference to all of the [Particle]'s handles that were declared in
     * the manifest.
     */
    abstract val handles: HandleHolder
}
