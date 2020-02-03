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

    /**
     * Rendering through UiBroker.
     *
     * Only implemented for wasm, no-op on JVM.
     */
    fun renderOutput() = Unit

    /**
     * Define template for rendering (optional).
     *
     * Only implemented for wasm, no-op on JVM.
     *
     * @param slotName name of slot where template is rendered.
     * @see [renderOutput]
     */
    fun getTemplate(slotName: String): String? = null

    /**
     * Populate model for rendering (UiBroker model).
     *
     * Only implemented for wasm, no-op on JVM.
     *
     * @param slotName name of slot where model data is populated
     * @param model Starting model state; Default: empty map
     * @return new model state
     * @see [renderOutput]
     */
    fun populateModel(
        slotName: String,
        model: Map<String, Any> = mapOf()
    ): Map<String, Any>? = model

    /**
     * Register a reaction to an event (optional).
     *
     * Particle templates may emit events, usually from user actions.
     *
     * Only implemented for wasm, no-op on JVM.
     *
     * @param name The name of the triggered event
     * @param handler A callback (consumer) in reaction to the event
     * @see [renderOutput]
     */
    fun eventHandler(name: String, handler: (Map<String, String>) -> Unit) = Unit
}
