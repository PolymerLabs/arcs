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

        if (handles.containsKey(handleName)) {
            val handle = handles[handleName]!!
            if (willSync) {
                toSync.add(handle)
            }
            return handle
        }
        log("Handle $handleName not registered")
        return null
    }

    fun sync(handle: Handle) {
        log("Particle.sync called")
        toSync.remove(handle)
        onHandleSync(handle, toSync.isEmpty())
    }

    abstract fun onHandleUpdate(handle: Handle)
    abstract fun onHandleSync(handle: Handle, allSynced: Boolean)

    fun renderOutput() {
      log("renderOutput")
      val slotName = ""
      val template = getTemplate(slotName)
      val dict = populateModel(slotName)
      val model = StringEncoder.encodeDictionary(dict)
      onRenderOutput(this.toWasmAddress(), template.toWasmString(), model.toWasmString())
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
        this.toWasmAddress(),
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
    var name: String? = null
    var particle: Particle? = null
    abstract fun sync(encoded: String)
    abstract fun update(added: String, removed: String)
}

open class Singleton<T : Entity<T>> constructor(val entityCtor: () -> T) : Handle() {
    private var entity: T? = null

    override fun sync(encoded: String) {
        entity = entityCtor.invoke().decodeEntity(encoded)
    }

    override fun update(added: String, removed: String) {
        entity = entityCtor.invoke().decodeEntity(added)
    }

    fun get(): T? {
        return entity
    }

    fun set(entity: T) {
        this.entity = entity
        val encoded = entity.encodeEntity()
        singletonSet(
            this.particle!!.toWasmAddress(),
            this.toWasmAddress(),
            encoded.toWasmString()
        )
    }

    fun clear() {
        entity = entityCtor()
        singletonClear(this.particle!!.toWasmAddress(), this.toWasmAddress())
    }
}

class Collection<T : Entity<T>> constructor(private val entityCtor: () -> T) : Handle(),
    Iterable<T> {
    override fun iterator(): Iterator<T> {
        return entities.values.iterator()
    }

    private val entities: MutableMap<String, T> = mutableMapOf()

    override fun sync(encoded: String) {
        entities.clear()
        add(encoded)
    }

    override fun update(added: String, removed: String) {
        add(added)
        val decoder = StringDecoder(removed)
            var num = decoder.getInt(":")
            while (num-- > 0) {
                val len = decoder.getInt(":")
                val chunk = decoder.chomp(len)
                // TODO: just get the id, no need to decode the full entity
                val entity = entityCtor.invoke().decodeEntity(chunk)!!
                entities.remove(entity.internalId)
            }
    }

    fun size(): Int {
        return entities.size
    }

    fun empty(): Boolean {
        return entities.isEmpty()
    }

    fun store(entity: T) {
        entities[entity.internalId] = entity
        val encoded = entities[entity.internalId]!!.encodeEntity()
        collectionStore(this.particle!!.toWasmAddress(), this.toWasmAddress(), encoded.toWasmString())
    }

    fun remove(entity: T) {
        val it = entities[entity.internalId]
        if (it != null) {
            val encoded: String = it.encodeEntity()
            entities.remove(entity.internalId)
            collectionRemove(this.particle!!.toWasmAddress(), this.toWasmAddress(), encoded.toWasmString())
        }
    }

    private fun add(added: String) {
        val decoder = StringDecoder(added)
        var num = decoder.getInt(":")
        while (num-- > 0) {
            val len = decoder.getInt(":")
            val chunk = decoder.chomp(len)
            val entity = entityCtor.invoke().decodeEntity(chunk)!!
            entities[entity.internalId] = entity
        }
    }

    fun clear() {
        entities.clear()
        collectionClear(this.particle!!.toWasmAddress(), this.toWasmAddress())
    }
}

fun main() {
}



