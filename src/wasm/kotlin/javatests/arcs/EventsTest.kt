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

package wasm.kotlin.javatests.arcs

import arcs.Particle
import arcs.Singleton
import arcs.wasm.toAddress
import kotlin.native.internal.ExportForCppRuntime
import kotlin.native.Retain

class EventsTest : Particle() {
    private val output = Singleton { EventsTest_Output() }

    init {
        registerHandle("output", output)
    }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        output.set(EventsTest_Output(txt = "event:$slotName:$eventName:${eventData["info"]}"))
    }
}

@Retain
@ExportForCppRuntime("_newEventsTest")
fun constructEventTest() = EventsTest().toAddress()
