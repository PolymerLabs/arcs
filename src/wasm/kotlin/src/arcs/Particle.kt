package arcs

import kotlin.collections.set

/**
 * Base class for all Wasm Particles.
 */
abstract class Particle : WasmObject() {
    private val handles: MutableMap<String, Handle> = mutableMapOf()
    private val toSync: MutableSet<Handle> = mutableSetOf()
    private val eventHandlers: MutableMap<String, () -> Unit> = mutableMapOf()

    fun registerHandle(name: String, handle: Handle) {
        handle.name = name
        handle.particle = this
        handles[name] = handle
        log("Registering $name")
    }

    fun eventHandler(name: String, handler: () -> Unit) {
        eventHandlers[name] = handler
    }

    fun connectHandle(handleName: String, willSync: Boolean): Handle? {
        log("Connect called internal '$handleName'")

        handles[handleName]?.let {
            if (willSync) toSync.add(it)
            return it
        }

        log("Handle $handleName not registered")
        return null
    }

    fun sync(handle: Handle) {
        log("Particle.sync called")
        toSync.remove(handle)
        onHandleSync(handle, toSync.isEmpty())
    }

    open fun onHandleUpdate(handle: Handle) {}
    open fun onHandleSync(handle: Handle, allSynced: Boolean) {}

    fun renderOutput() {
      log("renderOutput")
      val slotName = ""
      val template = getTemplate(slotName)
      val dict = populateModel(slotName)
      val model = StringEncoder.encodeDictionary(dict)
      onRenderOutput(toWasmAddress(), template.toWasmString(), model.toWasmString())
    }

    /**
      * @deprecated for contexts using UiBroker (e.g Kotlin)
      */
    fun renderSlot(slotName: String, sendTemplate: Boolean = true, sendModel: Boolean = true) {
        log("ignoring renderSlot")
    }

    fun serviceRequest(call: String, args: Map<String, String> = mapOf(), tag: String = "") {
      val encoded = StringEncoder.encodeDictionary(args)
      serviceRequest(
        toWasmAddress(),
        call.toWasmString(),
        encoded.toWasmString(),
        tag.toWasmString()
      )
    }

    open fun fireEvent(slotName: String, eventName: String) {
      eventHandlers[eventName]?.invoke()
      renderSlot(slotName)
    }

    /**
     * Resolves urls like 'https://$particles/path/to/assets/pic.jpg'.
     *
     * The `$here` prefix can be used to refer to the location of the current wasm binary:
     *   `$here/path/to/assets/pic.jpg`
     *
     * @param String URL with $variables
     * @return absolute URL
     */
    fun resolveUrl(url: String): String {
      val r: WasmString = resolveUrl(url.toWasmString())
      val resolved = r.toKString()
      _free(r)
      return resolved
    }

    open fun init() {}
    open fun getTemplate(slotName: String): String = ""
    open fun populateModel(slotName: String, model: Map<String, String> = mapOf()): Map<String, String> = model
    open fun serviceResponse(call: String, response: Map<String, String>, tag: String = "") {}

}

abstract class Handle : WasmObject() {
    lateinit var name: String
    lateinit var particle: Particle
    abstract fun sync(encoded: String)
    abstract fun update(added: String, removed: String)
}

open class Singleton<T : Entity<T>>(val entityCtor: () -> T) : Handle() {
    private var entity: T? = null

    override fun sync(encoded: String) {
        entity = entityCtor().decodeEntity(encoded)
    }

    override fun update(added: String, removed: String) {
        entity = entityCtor().decodeEntity(added)
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

class Collection<T : Entity<T>>(private val entityCtor: () -> T) : Handle(),
    Iterable<T> {

    private val entities: MutableMap<String, T> = mutableMapOf()

    val size: Int
        get() = entities.size

    override fun iterator() = entities.values.iterator()

    override fun sync(encoded: String) {
        entities.clear()
        add(encoded)
    }

    override fun update(added: String, removed: String) {
        add(added)
        with(StringDecoder(removed)) {
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
            getInt(":").downTo(0).forEach {
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

fun main() {
}
