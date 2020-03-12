/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk.wasm

class CombineUpdatesTest : AbstractCombineUpdatesTest() {
    var singleHandleCount = 0
    var doubleHandleCount = 0

    init {
        handles.handle1.onUpdate {
            singleHandleCount = singleHandleCount + 1
        }

        combineUpdates(
            handles.handle1,
            handles.handle2
        ) { _, _ -> doubleHandleCount++ }
    }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        when (eventName) {
            "checkEvents" -> {
                if (singleHandleCount != 1) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Single Handle OnUpdate called ${singleHandleCount} times.")
                    )
                }
                if (doubleHandleCount != 2) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Calling combineUpdates with 2 Handles called ${doubleHandleCount} times.")
                    )
                }
            }
        }
    }
}
