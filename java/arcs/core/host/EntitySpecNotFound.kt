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
 * Called when no [arcs.sdk.JvmEntitySpec] was found in the [Particle]'s associated
 * [HandleHolder.entitySpec] map. This can happen if a [Handle] has been created for a
 * [Particle] which had declaration for it in it's manifest and may indicate that the
 * manifest and generated code are out of sync.
 */
class EntitySpecNotFound(
    handleName: String,
    handleHolder: HandleHolder
) : Exception("No JvmEntitySpec found for $handleName on HandleHolder ${handleHolder::class}")
