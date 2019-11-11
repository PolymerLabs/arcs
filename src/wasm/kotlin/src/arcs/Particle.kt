package arcs

import kotlin.collections.set

/**
 * Base class for all Wasm Particles.
 */
abstract class Particle : WasmObject() {
    private val handles: MutableMap<String, Handle> = mutableMapOf()
    private val toSync: MutableSet<Handle> = mutableSetOf()
    private val eventHandlers: MutableMap<String, (Map<String, String>) -> Unit> = mutableMapOf()

    /** Execute on initialization of Particle. */
    open fun init() = Unit

    /**
     * Associate a handle name to a handle object.
     *
     * @param name Name of handle from particle in manifest
     * @param handle Singleton or Collection, defined in this particle class
     */
    fun registerHandle(name: String, handle: Handle) {
        handle.name = name
        handle.particle = this
        handles[name] = handle
        log("Registering $name")
    }

    /**
     * Connect to a registered handle
     *
     * If a handle has been previously registered, return the handle. Optionally, mark the handle for later
     * synchronization.
     *
     * @param name Name of the handle
     * @param willSync Mark handle for synchronization; depends if handle is readable
     * @return The name-associated handle, or null
     * @see [registerHandle]
     * @see [onHandleSync]
     */
    fun connectHandle(name: String, willSync: Boolean): Handle? {
        log("Connect called internal '$name'")

        handles[name]?.let {
            if (willSync) toSync.add(it)
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
        log("Particle.sync called")
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
    open fun onHandleUpdate(handle: Handle) = renderOutput()

    /**
     * React to handle synchronization.
     *
     * Called for handles that are marked for synchronization at connection, when they are updated with the full model
     * of their data. This will occur once after setHandles() and any time thereafter if the handle is resynchronized.
     * Default action is to trigger rendering.
     *
     * @param handle  Singleton or Collection handle
     * @param allSynced flag indicating if all handles are synchronized
     */
    open fun onHandleSync(handle: Handle, allSynced: Boolean) = renderOutput()

    /** Rendering through UiBroker */
    fun renderOutput() {
        log("renderOutput")
        val slotName = ""
        val template = getTemplate(slotName)
        val model = populateModel(slotName)?.let { StringEncoder.encodeDictionary(it) }
        onRenderOutput(toWasmAddress(), template.toWasmNullableString(), model.toWasmNullableString())
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
    open fun populateModel(slotName: String, model: Map<String, Any?> = mapOf()): Map<String, Any?>? = model

    /** @deprecated for contexts using UiBroker (e.g Kotlin) */
    @Deprecated("Rendering refactored to use UiBroker.", ReplaceWith("renderOutput()"))
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
        val encoded = StringEncoder.encodeDictionary(args)
        serviceRequest(
            toWasmAddress(),
            call.toWasmString(),
            encoded.toWasmString(),
            tag.toWasmString()
        )
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
    fun resolveUrl(url: String): String {
        val r: WasmString = resolveUrl(url.toWasmString())
        val resolved = r.toKString()
        _free(r)
        return resolved
    }

}

abstract class Handle : WasmObject() {
    lateinit var name: String
    lateinit var particle: Particle
    abstract fun sync(encoded: String?)
    abstract fun update(added: String?, removed: String?)
}

open class Singleton<T : Entity<T>>(val entityCtor: () -> T) : Handle() {
    private var entity: T? = null

    override fun sync(encoded: String?) {
        entity = encoded?.let { entityCtor().decodeEntity(encoded) } ?: entityCtor()
    }

    override fun update(added: String?, removed: String?) {
        entity = added?.let { entityCtor().decodeEntity(added) } ?: entityCtor()
    }

    fun get() = entity

    fun set(entity: T) {
        this.entity = entity
        val encoded = entity.encodeEntity()
        singletonSet(
            particle.toWasmAddress(),
            toWasmAddress(),
            encoded.toWasmString()
        )
    }

    fun clear() {
        entity = entityCtor()
        singletonClear(particle.toWasmAddress(), toWasmAddress())
    }
}

class Collection<T : Entity<T>>(private val entityCtor: () -> T) : Handle(), Iterable<T> {

    private val entities: MutableMap<String, T> = mutableMapOf()

    val size: Int
        get() = entities.size

    override fun iterator() = entities.values.iterator()

    override fun sync(encoded: String?) {
        entities.clear()
        encoded?.let { add(it) }
    }

    override fun update(added: String?, removed: String?) {
        added?.let { add(added) }
        removed?.let {
            with(StringDecoder(it)) {
                var num = getInt(":")
                while (num-- > 0) {
                    val len = getInt(":")
                    val chunk = chomp(len)
                    // TODO: just get the id, no need to decode the full entity
                    val entity = entityCtor().decodeEntity(chunk)!!
                    entities.remove(entity.internalId)
                }
            }
        }
    }

    fun isEmpty() = entities.isEmpty()

    fun store(entity: T) {
        entities[entity.internalId] = entity
        val encoded = entities[entity.internalId]!!.encodeEntity()
        collectionStore(particle.toWasmAddress(), toWasmAddress(), encoded.toWasmString())
    }

    fun remove(entity: T) {
        entities[entity.internalId]?.let {
            val encoded: String = it.encodeEntity()
            entities.remove(entity.internalId)
            collectionRemove(particle.toWasmAddress(), toWasmAddress(), encoded.toWasmString())
        }
    }

    private fun add(added: String) {
        with(StringDecoder(added)) {
            repeat(getInt(":")) {
                val len = getInt(":")
                val chunk = chomp(len)
                val entity = entityCtor().decodeEntity(chunk)!!
                entities[entity.internalId] = entity
            }
        }
    }

    fun clear() {
        entities.clear()
        collectionClear(particle.toWasmAddress(), toWasmAddress())
    }
}
