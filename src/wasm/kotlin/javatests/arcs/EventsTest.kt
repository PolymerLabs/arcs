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

class EventsTest : Particle() {
    private val output = Singleton(this, "output") { EventsTest_Output("") }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        output.set(EventsTest_Output(txt = "event:$slotName:$eventName:${eventData["info"]}"))
    }
}

@Retain
@ExportForCppRuntime("_newEventsTest")
fun constructEventTest() = EventsTest().toAddress()
