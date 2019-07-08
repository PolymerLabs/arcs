package arcs

import kotlin.collections.set

typealias URL = String

abstract class Entity<T> {
    var internalId = ""
    abstract fun decodeEntity(encoded: String): T?
    abstract fun encodeEntity(): String
}

/**
 * Base class for all Wasm Particles.
 */
abstract class Particle : WasmObject() {
    private val handles: MutableMap<String, Handle> = mutableMapOf()
    private val toSync: MutableSet<Handle> = mutableSetOf()
    private val eventHandlers: MutableMap<String, () -> Unit> = mutableMapOf()

    fun registerHandle(name: String, handle: Handle) {
        handle.name = name
        handle.particle_ = this
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
    abstract fun onHandleSync(handle: Handle, willSync: Boolean)
    fun renderSlot(slotName: String, sendTemplate: Boolean = true, sendModel: Boolean = true) {
      val template = if (sendTemplate) getTemplate(slotName) else ""
      var model = ""
      if (sendModel) {
        val sb = StringBuilder()
        var i = 0
        populateModel(slotName) { key: String, value: String ->
          sb.append(key.length).append(":").append(key)
          sb.append(value.length).append(":").append(value)
          i++
        }
        model = "$i:$sb"
      }

      render(this.toWasmAddress(), slotName.toWasmString(), template.toWasmString(), model.toWasmString())
    }

    open fun fireEvent(slotName: String, eventName: String) {
      eventHandlers[eventName]?.invoke()
      renderSlot(slotName)
    }

    open fun getTemplate(slotName: String): String = ""
    open fun populateModel(slotName: String, accumulateModel: (String, String) -> Unit): String = ""
}

abstract class Handle : WasmObject() {
    var name: String? = null
    var particle_: Particle? = null
    abstract fun sync(encoded: String)
    abstract fun update(encoded1: String, encoded2: String)
}

open class Singleton<T : Entity<T>> constructor(val entityCtor: () -> T) : Handle() {
    private var entity: T? = null

    override fun sync(encoded: String) {
        entity = entityCtor.invoke().decodeEntity(encoded)
    }

    override fun update(encoded1: String, encoded2: String) {
        entity = entityCtor.invoke().decodeEntity(encoded1)
    }

    fun get(): T? {
        return entity
    }

    fun set(entity: T) {
        this.entity = entity
        val encoded = entity.encodeEntity()
        singletonSet(
            this.particle_.toWasmAddress(),
            this.toWasmAddress(),
            encoded.toWasmString()
        )
    }

    fun clear() {
        entity = entityCtor()
        singletonClear(this.particle_.toWasmAddress(), this.toWasmAddress())
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
        collectionStore(this.particle_.toWasmAddress(), this.toWasmAddress(), encoded.toWasmString())
    }

    fun remove(entity: T) {
        val it = entities[entity.internalId]
        if (it != null) {
            val encoded: String = it.encodeEntity()
            entities.remove(entity.internalId)
            collectionRemove(this.particle_.toWasmAddress(), this.toWasmAddress(), encoded.toWasmString())
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
        collectionClear(this.particle_.toWasmAddress(), this.toWasmAddress())
    }
}

class StringDecoder(private var str: String) {

    fun done():Boolean {
        return str.isEmpty()
    }

    fun upTo(sep: String): String {
        val ind = str.indexOf(sep)
        if (ind == -1) {
            error("Packaged entity decoding failed in upTo()\n")
        }
        val token = str.substring(0, ind)
        str = str.substring(ind + 1)
        return token
    }

    fun getInt(sep: String): Int {
        val token = upTo(sep)
        return token.toInt()
    }

    fun chomp(len: Int): String {
        // TODO: detect overrun
        val token = str.substring(0, len)
        str = str.substring(len)
        return token
    }

    fun validate(token: String) {
        if (chomp(token.length) != token) {
            throw Exception("Packaged entity decoding failed in validate()\n")
        }
    }

    fun decodeText(): String {
        val len = getInt(":")
        return chomp(len)
    }

    fun decodeNum(): Double {
        val token = upTo(":")
        return token.toDouble()
    }

    fun decodeBool(): Boolean {
        return (chomp(1)[0] == '1')
    }
}

class StringEncoder(private val sb: StringBuilder = StringBuilder()) {

    fun result():String = sb.toString()

    fun encode(prefix: String, str: String) {
        sb.append(prefix + str.length.toString() + ":" + str + "|")
    }

    fun encode(prefix: String, num: Double) {
        sb.append("$prefix$num:|")
    }

    fun encode(prefix: String, flag: Boolean) {
        sb.append("$prefix${if (flag) "1" else "0"}|")
    }
}

fun main() {
}



