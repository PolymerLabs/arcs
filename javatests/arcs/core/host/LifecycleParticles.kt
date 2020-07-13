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

    private fun data() = handles.data.fetch()?.num.toString()
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

    private fun data() = handles.data.fetch()?.num.toString()
    private fun list() = handles.list.fetchAll().map { it.txt }.toSortedSet()
    private fun config() = handles.config.fetch()?.flg.toString()
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

    private fun data() = handles.data.fetch()?.num.toString()
    private fun list() = handles.list.fetchAll().map { it.txt }.toSortedSet()
}

class ReadWriteAccessParticle : AbstractReadWriteAccessParticle() {
    val errors = mutableListOf<String>()
    private var method = ""
    private val value = Value("x")

    override fun onFirstStart() {
        method = "onFirstStart"

        // Reads are not valid now; writes are.
        checkAllReadsFail()
        checkAllWritesSucceed()

        // Check that read ops work in the onReady listener for each readable handle.
        handles.sngRead.onReady {
            checkSuccess("sngRead.fetch") { handles.sngRead.fetch() }
        }
        handles.sngReadWrite.onReady {
            checkSuccess("sngReadWrite.fetch") { handles.sngReadWrite.fetch() }
        }
        handles.colRead.onReady {
            checkSuccess("colRead.fetchAll") { handles.colRead.fetchAll() }
        }
        handles.colReadWrite.onReady {
            checkSuccess("colReadWrite.fetchAll") { handles.colReadWrite.fetchAll() }
        }

        // Check that entities stored now can be read back in onReady.
        handles.sngPersist.store(Value("sng"))
        handles.colPersist.store(Value("col"))
    }

    override fun onStart() {
        method = "onStart"

        // Reads are not valid now; writes are.
        checkAllReadsFail()
        checkAllWritesSucceed()
    }

    override fun onReady() {
        method = "onReady"

        // Reads and writes are valid now.
        checkAllReadsSucceed()
        checkAllWritesSucceed()

        // Verify the entities stored in onFirstStart.
        val sval = handles.sngPersist.fetch()
        if (sval?.txt != "sng") {
            errors.add("expected Value(txt = sng) in sngPersist; got $sval")
        }
        val cval = handles.colPersist.fetchAll().firstOrNull()
        if (cval?.txt != "col") {
            errors.add("expected Value(txt = col) in colPersist; got $cval")
        }
    }

    private fun checkAllReadsFail() {
        checkReadFailure("sngRead.fetch") { handles.sngRead.fetch() }
        checkReadFailure("sngReadWrite.fetch") { handles.sngReadWrite.fetch() }
        checkReadFailure("colRead.size") { handles.colRead.size() }
        checkReadFailure("colRead.isEmpty") { handles.colRead.isEmpty() }
        checkReadFailure("colRead.fetchAll") { handles.colRead.fetchAll() }
        checkReadFailure("colReadWrite.size") { handles.colReadWrite.size() }
        checkReadFailure("colReadWrite.isEmpty") { handles.colReadWrite.isEmpty() }
        checkReadFailure("colReadWrite.fetchAll") { handles.colReadWrite.fetchAll() }
    }

    private fun checkAllReadsSucceed() {
        checkSuccess("sngRead.fetch") { handles.sngRead.fetch() }
        checkSuccess("sngReadWrite.fetch") { handles.sngReadWrite.fetch() }
        checkSuccess("colRead.size") { handles.colRead.size() }
        checkSuccess("colRead.isEmpty") { handles.colRead.isEmpty() }
        checkSuccess("colRead.fetchAll") { handles.colRead.fetchAll() }
        checkSuccess("colReadWrite.size") { handles.colReadWrite.size() }
        checkSuccess("colReadWrite.isEmpty") { handles.colReadWrite.isEmpty() }
        checkSuccess("colReadWrite.fetchAll") { handles.colReadWrite.fetchAll() }
    }

    private fun checkAllWritesSucceed() {
        checkSuccess("sngWrite.store") { handles.sngWrite.store(value) }
        checkSuccess("sngWrite.clear") { handles.sngWrite.clear() }
        checkSuccess("sngReadWrite.store") { handles.sngReadWrite.store(value) }
        checkSuccess("sngReadWrite.clear") { handles.sngReadWrite.clear() }
        checkSuccess("colWrite.store") { handles.colWrite.store(value) }
        checkSuccess("colWrite.remove") { handles.colWrite.remove(value) }
        checkSuccess("colWrite.clear") { handles.colWrite.clear() }
        checkSuccess("colReadWrite.store") { handles.colReadWrite.store(value) }
        checkSuccess("colReadWrite.remove") { handles.colReadWrite.remove(value) }
        checkSuccess("colReadWrite.clear") { handles.colReadWrite.clear() }
    }

    private fun checkReadFailure(action: String, block: () -> Unit) {
        try {
            block()
            errors.add("$action should have failed in $method")
        } catch (e: Exception) {
            if (e !is IllegalStateException ||
                    !e.message!!.startsWith("Read operations are not valid before onReady")) {
                errors.add("$action failed with an unexpected exception type or message: $e")
            }
        }
    }

    private fun checkSuccess(action: String, block: () -> Unit) {
        try {
            block()
        } catch (e: Exception) {
            errors.add("$action failed unexpectedly in $method")
        }
    }
}
