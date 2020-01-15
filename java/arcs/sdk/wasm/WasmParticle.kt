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

package arcs.sdk.wasm

import arcs.sdk.Handle
import arcs.sdk.Particle

/**
 * Base class for all wasm particles.
 */
abstract class WasmParticle : Particle {
    private val handles: MutableMap<String, Handle> = mutableMapOf()
    private val toSync: MutableSet<Handle> = mutableSetOf()
    private val eventHandlers: MutableMap<String, (Map<String, String>) -> Unit> = mutableMapOf()

    /** Execute on initialization of Particle. */
    open fun init() = Unit

    /**
     * Called during Handle construction to build the handles map.
     *
     * @param handle Singleton or Collection, defined in this particle class
     */
    fun registerHandle(handle: Handle) {
        handles[handle.name] = handle
    }

    /**
     * Connect to a registered handle
     *
     * If a handle has been previously registered, return the handle. Optionally, mark the handle for later
     * synchronization.
     *
     * @param name Name of the handle
     * @param canRead Mark handle with read access
     * @param canWrite Mark handle with write access
     * @return The name-associated handle, or null
     * @see [registerHandle]
     * @see [onHandleSync]
     */
    @Suppress("UNUSED_PARAMETER")
    fun connectHandle(name: String, canRead: Boolean, canWrite: Boolean): Handle? {
        handles[name]?.let {
            if (canRead) {
                toSync.add(it)
            }
            return it
        }

        log("Handle $name not registered")
        return null
    }

    /**
     * Register a reaction to an event.
     *
     * Particle templates may emit events, usually from user actions.
     *
     * @param name The name of the triggered event
     * @param handler A callback (consumer) in reaction to the event
     */
    fun eventHandler(name: String, handler: (Map<String, String>) -> Unit) {
        eventHandlers[name] = handler
    }

    /**
     * Trigger an event.
     *
     * Will target registered events, if present. Will always initiate rendering when called.
     *
     * @param slotName Slot that the event is associated with; likely `root`
     * @param eventName Name of the event to trigger
     * @param eventData Data associated with the event; will be passed into event handler
     * @see [eventHandler]
     */
    open fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        eventHandlers[eventName]?.invoke(eventData)
        renderOutput()
    }

    /** @param handle Handle to synchronize */
    fun sync(handle: Handle) {
        toSync.remove(handle)
        onHandleSync(handle, toSync.isEmpty())
    }

    /**
     * React to handle updates.
     *
     * Called for handles when change events are received from the backing store. Default action is to trigger
     * rendering.
     *
     * @param handle Singleton or Collection handle
     */
    open fun onHandleUpdate(handle: Handle) = Unit

    /**
     * React to handle synchronization.
     *
     * Called for handles that are marked for synchronization at connection, when they are updated with the full model
     * of their data. This will occur once after setHandles() and any time thereafter if the handle is resynchronized.
     * Default action is to trigger rendering.
     *
     * @param handle Singleton or Collection handle
     * @param allSynced flag indicating if all handles are synchronized
     */
    open fun onHandleSync(handle: Handle, allSynced: Boolean) = Unit

    /** Rendering through UiBroker */
    fun renderOutput() {
        val slotName = ""
        val template = getTemplate(slotName)
        val model = populateModel(slotName)?.let {
            StringEncoder().encodeDictionary(it).toNullTermByteArray()
        }
        WasmRuntimeClient.onRenderOutput(this, template, model)
    }

    /**
     * Define template for rendering (optional)
     *
     * @param slotName name of slot where template is rendered.
     * @see [renderOutput]
     */
    open fun getTemplate(slotName: String): String? = null

    /**
     * Populate model for rendering (UiBroker model)
     *
     * @param slotName name of slot where model data is populated
     * @param model Starting model state; Default: empty map
     * @return new model state
     * @see [renderOutput]
     */
    open fun populateModel(
        slotName: String,
        model: Map<String, Any> = mapOf()
    ): Map<String, Any>? = model

    /** @deprecated for contexts using UiBroker (e.g Kotlin) */
    @Deprecated("Rendering refactored to use UiBroker.", ReplaceWith("renderOutput()"))
    @Suppress("UNUSED_PARAMETER")
    fun renderSlot(slotName: String, sendTemplate: Boolean = true, sendModel: Boolean = true) {
        log("ignoring renderSlot")
    }

    /**
     * Request response from Service
     *
     * @param call string encoding of service name; follows `service.method` pattern
     * @param args Key-value encoded arguments for service request
     * @param tag Optionally, give a name to the particular service call
     */
    fun serviceRequest(call: String, args: Map<String, String> = mapOf(), tag: String = "") {
        val encoded = StringEncoder().encodeDictionary(args).toNullTermByteArray()
        WasmRuntimeClient.serviceRequest(this, call, encoded, tag)
    }

    /**
     * Process response from Service call
     *
     * @param call string encoding of service name; follows `service.method` pattern
     * @param response Data returned from service
     * @param tag Optional, name given to particular service call
     */
    open fun serviceResponse(call: String, response: Map<String, String>, tag: String = "") = Unit

    /**
     * Resolves urls like 'https://$particles/path/to/assets/pic.jpg'.
     *
     * The `$here` prefix can be used to refer to the location of the current wasm binary:
     *   `$here/path/to/assets/pic.jpg`
     *
     * @param url URL with $variables
     * @return absolute URL
     */
    fun resolveUrl(url: String): String = WasmRuntimeClient.resolveUrl(url)
}
