package arcs.core.host

class SingleReadHandleParticle : AbstractSingleReadHandleParticle() {
    val events = mutableListOf<String>()

    override fun onFirstStart() {
        events.add("onFirstStart")
    }

    override fun onStart() {
        handles.data.onReady { events.add("data.onReady:${data()}") }
        handles.data.onUpdate { events.add("data.onUpdate:${data()}") }
        events.add("onStart")
    }

    override fun onReady() {
        events.add("onReady:${data()}")
    }

    override fun onUpdate() {
        events.add("onUpdate:${data()}")
    }

    override fun onShutdown() {
        events.add("onShutdown")
    }

    fun data() = handles.data.fetch()?.num.toString()
}

class SingleWriteHandleParticle : AbstractSingleWriteHandleParticle() {
    val events = mutableListOf<String>()

    override fun onFirstStart() {
        events.add("onFirstStart")
    }

    override fun onStart() {
        events.add("onStart")
    }

    override fun onReady() {
        events.add("onReady")
    }

    override fun onUpdate() {
        events.add("onUpdate")
    }

    override fun onShutdown() {
        events.add("onShutdown")
    }
}

class MultiHandleParticle : AbstractMultiHandleParticle() {
    val events = mutableListOf<String>()

    override fun onFirstStart() {
        events.add("onFirstStart")
    }

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
    }

    override fun onUpdate() {
        events.add("onUpdate:${data()}:${list()}:${config()}")
    }

    override fun onShutdown() {
        events.add("onShutdown")
    }

    fun data() = handles.data.fetch()?.num.toString()
    fun list() = handles.list.fetchAll().map { it.txt }.toSortedSet()
    fun config() = handles.config.fetch()?.flg.toString()
}

class PausingParticle : AbstractPausingParticle() {
    val events = mutableListOf<String>()

    override fun onFirstStart() {
        events.add("onFirstStart")
    }

    override fun onStart() {
        handles.data.onReady { events.add("data.onReady:${data()}") }
        handles.data.onUpdate { events.add("data.onUpdate:${data()}") }
        handles.list.onReady { events.add("list.onReady:${list()}") }
        handles.list.onUpdate { events.add("list.onUpdate:${list()}") }
        events.add("onStart")
    }

    override fun onReady() {
        events.add("onReady:${data()}:${list()}")
    }

    override fun onUpdate() {
        events.add("onUpdate:${data()}:${list()}")
    }

    override fun onShutdown() {
        events.add("onShutdown")
    }

    fun data() = handles.data.fetch()?.num.toString()
    fun list() = handles.list.fetchAll().map { it.txt }.toSortedSet()
}
