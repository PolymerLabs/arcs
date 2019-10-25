package arcs.test

import arcs.*
import kotlin.native.internal.ExportForCppRuntime

/**
 * Sample WASM Particle.
 */
class TestParticle : Particle() {

    override fun onHandleUpdate(handle: Handle) {
      log("A handle was updated!")
        if (handle.name.equals("data")) {
          log("data was updated")
          updated = 1
        } else if (handle.name.equals("info")) {
          log("info was updated.")
          updated = 2
        }
    }

    override fun getTemplate(slotName: String): String {
      log("getting template")
      val dataCol = if (updated == 1) "color: blue;" else ""
      val dataStr = "${data.get().toString()}\n"

      val infoCol = if (updated == 2) "color: blue;" else ""
        var infoStr = "Size: ${info.size}\n"
        if (!info.isEmpty()) {
          var i = 0
          info.forEach { info ->
            infoStr += "${(++i)}. $info | \n"
          }
        } else {
          infoStr = "<i>(empty)</i>"
        }

        return """
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
            <td><button on-click="add">Add</button></td>
            <td><button on-click="store">Store</button></td>
            <td>
            <button on-click="throw">Throw</button> &nbsp;
            <button on-click="abort">Abort</button>
            </td>
            </tr>
            <tr>
            <td><button on-click="dataclear">Clear</button></td>
            <td><button on-click="remove">Remove</button></td>
            <td>
            <button on-click="assert">Assert</button> &nbsp;
            <button on-click="exit">Exit</button>
            </td>
            </tr>
            <tr>
            <td></td>
            <td><button on-click="infoclear">Clear</button></td>
            </tr>
             </table>""".trimIndent()
      }

    private val data = Singleton { TestParticle_Data() }
    private val res = Singleton { TestParticle_Res() }
    private val info = Collection { TestParticle_Info() }
    private var updated = 0
    private var storeCount = 0

    init {
        registerHandle("data", data)
        registerHandle("res", res)
        registerHandle("info", info)

        eventHandler("add") {
          val newData = data.get()!!
          newData.num = newData.num + 2
          newData.txt = newData.txt + "!!!!!!"
          this.data.set(newData)
        }

        eventHandler("dataclear") {
          data.clear()
        }

        eventHandler("store") {
          val info = TestParticle_Info()
          info.internalId = "wasm" + (++storeCount)
          info.val_ = (this.info.size + storeCount).toDouble()
          this.info.store(info)
        }

        eventHandler("remove") {
            val iterator = info.iterator()
            if (iterator.hasNext()) {
                info.remove(iterator.next())
            }
        }
        eventHandler("infoclear") {
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
