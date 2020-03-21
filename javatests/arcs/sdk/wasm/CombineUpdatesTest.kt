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
    var tripleHandleCount = 0
    var quadHandleCount = 0
    var quinHandleCount = 0
    var sixHandleCount = 0
    var septHandleCount = 0
    var octHandleCount = 0
    var novHandleCount = 0
    var decHandleCount = 0

    init {
        handles.handle1.onUpdate {
            singleHandleCount++
        }

        combineUpdates(
            handles.handle1,
            handles.handle2
        ) { _, _ ->  doubleHandleCount++ }

        combineUpdates(
            handles.handle1,
            handles.handle2,
            handles.handle3
        ) { _, _, _ -> tripleHandleCount++ }

        combineUpdates(
            handles.handle1,
            handles.handle2,
            handles.handle3,
            handles.handle4
        ) { _, _, _, _ -> quadHandleCount++ }

        combineUpdates(
            handles.handle1,
            handles.handle2,
            handles.handle3,
            handles.handle4,
            handles.handle5
        ) { _, _, _, _, _  -> quinHandleCount++ }

        combineUpdates(
            handles.handle1,
            handles.handle2,
            handles.handle3,
            handles.handle4,
            handles.handle5,
            handles.handle6
        ) { _, _, _, _, _, _ -> sixHandleCount++ }

        combineUpdates(
            handles.handle1,
            handles.handle2,
            handles.handle3,
            handles.handle4,
            handles.handle5,
            handles.handle6,
            handles.handle7
        ) { _, _, _, _, _, _, _ -> septHandleCount++ }

        combineUpdates(
            handles.handle1,
            handles.handle2,
            handles.handle3,
            handles.handle4,
            handles.handle5,
            handles.handle6,
            handles.handle7,
            handles.handle8
        ) { _, _, _, _, _, _, _, _ -> octHandleCount++ }

        combineUpdates(
            handles.handle1,
            handles.handle2,
            handles.handle3,
            handles.handle4,
            handles.handle5,
            handles.handle6,
            handles.handle7,
            handles.handle8,
            handles.handle9
        ) { _, _, _, _, _, _, _, _, _ -> novHandleCount++ }

        combineUpdates(
            handles.handle1,
            handles.handle2,
            handles.handle3,
            handles.handle4,
            handles.handle5,
            handles.handle6,
            handles.handle7,
            handles.handle8,
            handles.handle9,
            handles.handle10
        ) { _, _, _, _, _, _, _, _, _, _ -> decHandleCount++ }
    }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        when (eventName) {
            "checkEvents" -> {
                if (singleHandleCount == 1) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Single Handle OnUpdate called ${singleHandleCount} times.")
                    )
                }
                if (doubleHandleCount == 2) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Calling combineUpdates with 2 Handles called ${doubleHandleCount} times.")
                    )
                }
                if (doubleHandleCount == 2) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Calling combineUpdates with 2 Handles called ${doubleHandleCount} times.")
                    )
                }
                if (tripleHandleCount == 3) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Calling combineUpdates with 3 Handles called ${tripleHandleCount} times.")
                    )
                }
                if (quadHandleCount == 4) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Calling combineUpdates with 4 Handles called ${quadHandleCount} times.")
                    )
                }
                if (quinHandleCount == 5) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Calling combineUpdates with 5 Handles called ${quinHandleCount} times.")
                    )
                }
                if (sixHandleCount == 6) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Calling combineUpdates with 6 Handles called ${sixHandleCount} times.")
                    )
                }
                if (septHandleCount == 7) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Calling combineUpdates with 7 Handles called ${septHandleCount} times.")
                    )
                }
                if (octHandleCount == 8) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Calling combineUpdates with 8 Handles called ${octHandleCount} times.")
                    )
                }
                if (novHandleCount == 9) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Calling combineUpdates with 9 Handles called ${novHandleCount} times.")
                    )
                }
                if (decHandleCount == 10) {
                    handles.errors.store(
                        CombineUpdatesTest_Errors(msg = "Calling combineUpdates with 10 Handles called ${decHandleCount} times.")
                    )
                }
            }
        }
    }
}
