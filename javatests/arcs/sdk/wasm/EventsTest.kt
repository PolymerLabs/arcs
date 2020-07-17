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

package arcs.sdk.wasm

class EventsTest : AbstractEventsTest() {
    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        handles.output.store(
            EventsTest_Output(txt = "event:$slotName:$eventName:${eventData["info"]}")
        )
    }
}
