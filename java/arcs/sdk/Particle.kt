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

import arcs.core.host.api.Particle
import kotlinx.coroutines.runBlocking

/**
 * Interface used by [ArcHost]s to interact dynamically with code-generated [Handle] fields
 * used by [Particle]s.
 */
typealias HandleHolder = arcs.core.host.api.HandleHolder

/** Base interface for all particles. */
typealias Particle = Particle

/**
 * Base class used by `schema2kotlin` code-generator tool to generate a class containing all
 * declared handles.
 */
open class HandleHolderBase(
    private val particleName: String,
    private val entitySpecs: Map<String, EntitySpec<out Entity>>
) : HandleHolder {
    val handles = mutableMapOf<String, Handle>().withDefault { handleName ->
        checkHandleIsValid(handleName)
        throw NoSuchElementException(
            "Handle $handleName has not been initialized in $particleName yet."
        )
    }

    override fun getEntitySpec(handleName: String): EntitySpec<out Entity> {
        checkHandleIsValid(handleName)
        return entitySpecs.getValue(handleName)
    }

    override fun getHandle(handleName: String): Handle {
        checkHandleIsValid(handleName)
        return handles.getValue(handleName)
    }

    override fun setHandle(handleName: String, handle: Handle) {
        checkHandleIsValid(handleName)
        require(!handles.containsKey(handleName)) {
            "$particleName.$handleName has already been initialized."
        }
        handles[handleName] = handle
    }

    override fun reset() {
        runBlocking {
            handles.forEach { (_, handle) -> handle.close() }
        }
        handles.clear()
    }

    private fun checkHandleIsValid(handleName: String) {
        // entitySpecs is passed in the constructor with the full set of specs, so it can be
        // considered an authoritative list of which handles are valid and which aren't.
        if (!entitySpecs.containsKey(handleName)) {
            throw NoSuchElementException(
                "Particle $particleName does not have a handle with name $handleName."
            )
        }
    }
}
