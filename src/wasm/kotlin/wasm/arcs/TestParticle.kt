package arcs

import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class TestParticle : Particle() {

    override fun onHandleUpdate(handle: Handle) {
        if (handle.name.equals("data")) {
            updated = 1
        } else if (handle.name.equals("info")) {
            updated = 2
        }
        requestRender("root")
    }

    override fun onHandleSync(handle: Handle, willSync: Boolean) {
        log("onHandleSync called")
        if (willSync) {
            log("All handles synced\n")
            requestRender("root")
        }
    }

    private fun console(s: String) {
      log(s)
    }

    override fun requestRender(slotName: String) {
        val dataCol = if (updated == 1) "color: blue;" else ""
        val dataStr = "${data.get().toString()}\n"

        val infoCol = if (updated == 2) "color: blue;" else ""
        var infoStr = "Size: ${info.size()}\n"
        if (!info.empty()) {
            var i = 0
            info.forEach { info ->
                infoStr += "${(++i)}. $info | \n"
            }
        } else {
            infoStr = "<i>(empty)</i>"
        }

        val content = """
        <style>
        #data {""" + dataCol + """}
        #info {""" + infoCol + """}
        #panel { margin: 10px; }
        #panel pre { margin-left: 20px; }
        th,td { padding: 4px 16px; }
        </style>
        <div id="panel">
        <b id="data">[data]</b>
        <pre>""" + dataStr + """</pre>
        <b id="info">[info]</b>
        <pre>""" + infoStr + """</pre>
        </div>
        <table>
        <tr>
        <th>Singleton</th>
        <th>Collection</th>
        <th>Errors</th>
        </tr>
        <tr>
        <td><button on-click="set">Set</button></td>
        <td><button on-click="store">Store</button></td>
        <td>
        <button on-click="throw">Throw</button> &nbsp;
        <button on-click="abort">Abort</button>
        </td>
        </tr>
        <tr>
        <td><button on-click="vclear">Clear</button></td>
        <td><button on-click="remove">Remove</button></td>
        <td>
        <button on-click="assert">Assert</button> &nbsp;
        <button on-click="exit">Exit</button>
        </td>
        </tr>
        <tr>
        <td></td>
        <td><button on-click="cclear">Clear</button></td>
        </tr>
        </table>"""

        renderSlot(slotName, content)
    }

    private val data = Singleton { Data() }
    private val res = Singleton { Data() }
    private val info = Collection { Info() }
    private var updated = 0
    private var storeCount = 0

    init {
        registerHandle("data", data)
        registerHandle("res", res)
        registerHandle("info", info)

        eventHandler("set") {
            val res = data.get()!!
            res.num_ = res.num_ * 2
            res.txt_ = res.txt_ + "!!!!!!"
            res.lnk_ = ""
            this.res.set(res)
        }

        eventHandler("vclear") {
            res.clear()
        }

        eventHandler("store") {
            val info = Info()
            info.internalId = "wasm" + (++storeCount)
            info.val_ = (this.info.size() + storeCount).toDouble()
            this.info.store(info)
        }
        eventHandler("remove") {
            val iterator = info.iterator()
            if (iterator.hasNext()) {
                info.remove(iterator.next())
            }
        }
        eventHandler("cclear") {
            info.clear()
        }
        eventHandler("throw") {
            throw Exception("this message doesn't get passed (yet?)")
        }
        eventHandler("assert") {
            assert(2 + 2 == 3)
        }
        eventHandler("abort") {
            abort()
        }
        eventHandler("exit") {
//              exit(1)
        }
    }
}

@Retain
@ExportForCppRuntime("_newTestParticle")
fun construct(): WasmAddress {
    log("__newTestParticle called")
    return TestParticle().toWasmAddress()
}