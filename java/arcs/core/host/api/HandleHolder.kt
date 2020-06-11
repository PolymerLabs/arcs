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
package arcs.core.host.api

import arcs.core.entity.Entity
import arcs.core.entity.EntitySpec
import arcs.core.entity.Handle
import kotlinx.coroutines.CoroutineDispatcher

/**
 * Interface used by [ArcHost]s to interact dynamically with code-generated [Handle] fields
 * used by [Particle]s.
 *
 * @property handles Key is a handle name, value is the corresponding [Handle].
 * @property entitySpecs Key is a handle name, value is the corresponding [EntitySpec].
 */
interface HandleHolder {
    /**
     * When accessing a [Particle]'s handles from outside of particle lifecycle events (either by
     * calling methods on the particle from outside of Arcs, or from a launched coroutine, etc.),
     * you must make those accesses while running on this [CoroutineDispatcher].
     */
    val dispatcher: CoroutineDispatcher

    /** Returns the [Handle] for the given handle name. */
    fun getHandle(handleName: String): Handle

    /** Returns [EntitySpec]s for the given handle name. */
    fun getEntitySpecs(handleName: String): Set<EntitySpec<out Entity>>

    /** Sets the given [Handle]. */
    fun setHandle(handleName: String, handle: Handle)

    /** Erase and release all handle references from the [HandleHolder]. */
    fun reset()

    /** Check if there are no [Handle]s in the [HandleHolder]. */
    fun isEmpty(): Boolean
}
