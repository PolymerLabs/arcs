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

/**
 * Interface used by [ArcHost]s to interact dynamically with code-generated [Handle] fields
 * used by [Particle]s.
 *
 * @property map Key is a handle name, value is the corresponding [Handle].
 * @property entitySpecs Key is a handle name, value is the corresponding [EntitySpec].
 */
interface HandleHolder {
    val map: Map<String, Handle>
    val entitySpecs: Map<String, EntitySpec<out Entity>>
}

/**
 * Base class used by `schema2kotlin` code-generator tool to generate a class containing all
 * declared handles.
 */
abstract class HandleHolderBase(
    override val map: Map<String, Handle>,
    override val entitySpecs: Map<String, EntitySpec<out Entity>>
) : HandleHolder

/** Base interface for all particles. */
interface Particle {

    /**
     * React to handle updates.
     *
     * Called for handles when change events are received from the backing store.
     *
     * @param handle Singleton or Collection handle
     */
    fun onHandleUpdate(handle: Handle) = Unit

    /**
     * React to handle synchronization.
     *
     * Called for handles that are marked for synchronization at connection, when they are updated with the full model
     * of their data. This will occur once after setHandles() and any time thereafter if the handle is resynchronized.
     *
     * @param handle Singleton or Collection handle
     * @param allSynced flag indicating if all handles are synchronized
     */
    fun onHandleSync(handle: Handle, allSynced: Boolean) = Unit
}
