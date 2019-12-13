/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package sdk.kotlin.javatests.arcs

import arcs.Particle
import arcs.Singleton
import arcs.addressable.toAddress
import kotlin.native.Retain
import kotlin.native.internal.ExportForCppRuntime

class SingletonApiTest : Particle() {
    private val in_ = Singleton(this, "inHandle") { SingletonApiTest_InHandle(
        num = 0.0,
        txt = ""
    ) }
    private val out_ = Singleton(this, "outHandle") { SingletonApiTest_OutHandle(
        num = 0.0,
        txt = ""
    ) }
    private val io_ = Singleton(this, "ioHandle") { SingletonApiTest_IoHandle(
        num = 0.0,
        txt = ""
    ) }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        when (eventName) {
            "case1" -> {
                out_.clear()
                io_.clear()
            }
            "case2" -> {
                val input = in_.get()
                val d = SingletonApiTest_OutHandle(
                    num = input?.num ?: 0.0,
                    txt = input?.txt ?: ""
                )
                d.num = d.num.times(2)
                out_.set(d)
            }
            "case3" -> {
                val input = in_.get()
                val d = SingletonApiTest_IoHandle(
                    num = input?.num ?: 0.0,
                    txt = input?.txt ?: ""
                )
                d.num = d.num.times(3)
                io_.set(d)
            }
        }
    }
}

@Retain
@ExportForCppRuntime("_newSingletonApiTest")
fun constructSingletonApiTest() = SingletonApiTest().toAddress()
