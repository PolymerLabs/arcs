package arcs.core.host

import arcs.core.util.TaggedLog
import kotlinx.coroutines.Job

class SingleReadHandleParticle : AbstractSingleReadHandleParticle() {
    val onReadyCalled = Job()
    val events = mutableListOf<String>()

    override fun onFirstStart() { events.add("onFirstStart") }
    override fun onStart() {
        handles.data.onReady { events.add("data.onReady:${data()}") }
        handles.data.onUpdate { events.add("data.onUpdate:${data()}") }
        events.add("onStart")
    }
    override fun onReady() {
        events.add("onReady:${data()}")
        onReadyCalled.complete()
    }
    override fun onUpdate() { events.add("onUpdate:${data()}") }
    override fun onShutdown() { events.add("onShutdown") }

    fun data() = handles.data.fetch()?.num.toString()
}

class SingleWriteHandleParticle : AbstractSingleWriteHandleParticle() {
    val onReadyCalled = Job()
    val events = mutableListOf<String>()

    override fun onFirstStart() { events.add("onFirstStart") }
    override fun onStart() { events.add("onStart") }
    override fun onReady() {
        events.add("onReady")
        onReadyCalled.complete()
    }
    override fun onUpdate() { events.add("onUpdate") }
    override fun onShutdown() { events.add("onShutdown") }
}

class MultiHandleParticle : AbstractMultiHandleParticle() {
    val onReadyCalled = Job()
    val events = mutableListOf<String>()

    override fun onFirstStart() { events.add("onFirstStart") }
    override fun onStart() {
        handles.data.onReady { events.add("data.onReady:${data()}") }
        handles.data.onUpdate { events.add("data.onUpdate:${data()}") }
        handles.list.onReady { events.add("list.onReady:${list()}") }
        handles.list.onUpdate { events.add("list.onUpdate:${list()}") }
        handles.config.onReady { events.add("config.onReady:${config()}") }
        handles.config.onUpdate { events.add("config.onUpdate:${config()}") }
        events.add("onStart")
    }
    override fun onReady() {
        events.add("onReady:${data()}:${list()}:${config()}")
        onReadyCalled.complete()
    }
    override fun onUpdate() { events.add("onUpdate:${data()}:${list()}:${config()}") }
    override fun onShutdown() {
        events.add("onShutdown")
    }

    fun data() = handles.data.fetch()?.num.toString()
    fun list() = handles.list.fetchAll().map { it.txt }.toSortedSet()
    fun config() = handles.config.fetch()?.flg.toString()
}

class PausingParticle : AbstractPausingParticle() {
    private val log = TaggedLog { "PausingParticle" }
    val onReadyCalled = Job()
    val events = mutableListOf<String>()

    override fun onFirstStart() { events.add("onFirstStart") }
    override fun onStart() {
        addEvent("onStart")
        handles.data.onReady { addEvent("data.onReady:${data()}") }
        handles.data.onUpdate { addEvent("data.onUpdate:${data()}") }
        handles.list.onReady { addEvent("list.onReady:${list()}") }
        handles.list.onUpdate { addEvent("list.onUpdate:${list()}") }
    }
    override fun onReady() {
        addEvent("onReady:${data()}:${list()}")
        onReadyCalled.complete()
    }
    override fun onUpdate() { addEvent("onUpdate:${data()}:${list()}") }
    override fun onShutdown() { addEvent("onShutdown") }

    fun data() = handles.data.fetch()?.num.toString()
    fun list() = handles.list.fetchAll().map { it.txt }.toSortedSet()

    private fun addEvent(event: String) {
        log.info { "Observed: $event" }
        events.add(event)
    }
}
