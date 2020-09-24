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
import arcs.core.entity.Reference
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

    /** Remove all storage callbacks from the handles. Handle writing methods can still be used. */
    fun detach()

    /** Erase and release all handle references from the [HandleHolder]. */
    fun reset()

    /** Check if there are no [Handle]s in the [HandleHolder]. */
    fun isEmpty(): Boolean

    /**
     * Create a foreign [Reference] of type [T] with the given [id], checking for validity of
     * that [id].
     *
     * Note: this is a temporary method, this functionality will be part of the EntityHandle when we
     * have one and it is used to create references. That is, you first get the foreign entity, then
     * a reference to it.
     *
     * Returns null if the [id] is not valid.
     */
    suspend fun <T : Entity> createForeignReference(spec: EntitySpec<T>, id: String): Reference<T>?
}
