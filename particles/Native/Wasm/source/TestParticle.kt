/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.test

import arcs.Collection
import arcs.Handle
import arcs.Particle
import arcs.Singleton
import arcs.TestParticle_Data
import arcs.TestParticle_Info
import arcs.TestParticle_Res
import arcs.abort
import arcs.addressable.toAddress
import arcs.log
import kotlin.Exception
import kotlin.native.Retain
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

    override fun populateModel(slotName: String, model: Map<String, Any?>): Map<String, Any?>? {
        val dataCol = if (updated == 1) "color: blue;" else ""
        val dataStr = "${data.get()}\n"

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
        return mapOf(
            "dataCol" to dataCol,
            "dataStr" to dataStr,
            "infoCol" to infoCol,
            "infoStr" to infoStr
        )
    }

    override fun getTemplate(slotName: String): String {
        log("getting template")

        return """
                <style>
                #data {{dataCol}}
                #info {{infoCol}}
                #panel { margin: 10px; }
                #panel pre { margin-left: 20px; }
                th,td { padding: 4px 16px; }
                </style>
                <div id="panel">
                <b id="data">[data]</b>
                <pre>{{dataStr}}</pre>
                <b id="info">[info]</b>
                <pre>{{infoStr}}</pre>
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

    private val defaultData = TestParticle_Data(
        num = 0.0,
        txt = "",
        lnk = "",
        flg = false
    )
    private val defaultRes = TestParticle_Res(
        num = 0.0,
        txt = "",
        lnk = "",
        flg = false
    )
    private val defaultInfo = TestParticle_Info(
        for_ = "",
        val_ = 0.0
    )
    private val data = Singleton(this, "data") { defaultData }
    private val res = Singleton(this, "res") { defaultRes }
    private val info = Collection(this, "info") { defaultInfo }
    private var updated = 0
    private var storeCount = 0

    init {
        eventHandler("add") {
            val newData = data.get() ?: TestParticle_Data(
                num = 0.0,
                txt = "",
                lnk = "",
                flg = false
            )
            newData.num = newData.num.let { it + 2 }
            newData.txt = "${newData.txt}!!!!!!"
            this.data.set(newData)
        }

        eventHandler("dataclear") {
            data.clear()
        }

        eventHandler("store") {
            val info = TestParticle_Info(
                for_ = "",
                val_ = 0.0
            )
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
fun construct() = TestParticle().toAddress()
