package arcs.sdk.wasm

class WasmMultipleHandlesTest : AbstractWasmMultipleHandlesTest() {
    var singleHandleCount = 0
    var tupleHandleCount = 0
    var tripleHandleCount = 0
    var quadHandleCount = 0
    var quinHandleCount = 0
    var sixHandleCount = 0
    var septHandleCount = 0
    var octHandleCount = 0
    var novHandleCount = 0
    var decHandleCount = 0

    init {
        handles.handle1.onUpdate{
            singleHandleCount = singleHandleCount + 1
        }

        combine(
                handles.handle1,
                handles.handle2
        ).onUpdate { _, _ ->
            tupleHandleCount++
        }

        combine(
                handles.handle1,
                handles.handle2,
                handles.handle3
        ).onUpdate { _, _, _ ->
            tripleHandleCount++
        }

        combine(
                handles.handle1,
                handles.handle2,
                handles.handle3,
                handles.handle4
        ).onUpdate { _, _, _, _ ->
            quadHandleCount++
        }

        combine(
                handles.handle1,
                handles.handle2,
                handles.handle3,
                handles.handle4,
                handles.handle5
        ).onUpdate { _, _, _, _, _ ->
            quinHandleCount++
        }

        combine(
                handles.handle1,
                handles.handle2,
                handles.handle3,
                handles.handle4,
                handles.handle5,
                handles.handle6
        ).onUpdate { _, _, _, _, _, _ ->
            sixHandleCount++
        }

        combine(
                handles.handle1,
                handles.handle2,
                handles.handle3,
                handles.handle4,
                handles.handle5,
                handles.handle6,
                handles.handle7
        ).onUpdate { _, _, _, _, _, _, _ ->
            septHandleCount++
        }

        combine(
                handles.handle1,
                handles.handle2,
                handles.handle3,
                handles.handle4,
                handles.handle5,
                handles.handle6,
                handles.handle7,
                handles.handle8
        ).onUpdate { _, _, _, _, _, _, _, _ ->
            octHandleCount++
        }

        combine(
                handles.handle1,
                handles.handle2,
                handles.handle3,
                handles.handle4,
                handles.handle5,
                handles.handle6,
                handles.handle7,
                handles.handle8,
                handles.handle9
        ).onUpdate { _, _, _, _, _, _, _, _, _ ->
            novHandleCount++
        }

        combine(
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
        ).onUpdate { _, _, _, _, _, _, _, _, _, _ ->
            decHandleCount++
        }
    }

    override fun fireEvent(slotName: String, eventName: String, eventData: Map<String, String>) {
        when (eventName) {
            "checkEvents" -> {
                log("foo")
                if (singleHandleCount != 1) {
                    handles.errors.store(
                        WasmMultipleHandlesTest_Errors(msg = "Single Handle OnUpdate called ${singleHandleCount} times")
                    )
                }
                if (tupleHandleCount != 2) {
                    handles.errors.store(
                        WasmMultipleHandlesTest_Errors(msg = "Tuple Handle OnUpdate not called twice")
                    )
                }
                if (tripleHandleCount != 3) {
                    handles.errors.store(
                        WasmMultipleHandlesTest_Errors(msg = "Triple Handle OnUpdate not called 3 times")
                    )
                }
                if (quadHandleCount != 4) {
                    handles.errors.store(
                        WasmMultipleHandlesTest_Errors(msg = "Quad Handle OnUpdate not called 4 times")
                    )
                }
                if (quinHandleCount != 5) {
                    handles.errors.store(
                        WasmMultipleHandlesTest_Errors(msg = "Quin Handle OnUpdate not called 5 times")
                    )
                }
                if (sixHandleCount != 6) {
                    handles.errors.store(
                        WasmMultipleHandlesTest_Errors(msg = "Six Handle OnUpdate not called 6 times")
                    )
                }
                if (septHandleCount != 7) {
                    handles.errors.store(
                        WasmMultipleHandlesTest_Errors(msg = "Sept Handle OnUpdate not called 7 times")
                    )
                }
                if (octHandleCount != 8) {
                    handles.errors.store(
                        WasmMultipleHandlesTest_Errors(msg = "Oct Handle OnUpdate not called 8 times")
                    )
                }
                if (novHandleCount != 9) {
                    handles.errors.store(
                        WasmMultipleHandlesTest_Errors(msg = "Nov Handle OnUpdate not called 9 times")
                    )
                }
                if (decHandleCount != 10) {
                    handles.errors.store(
                        WasmMultipleHandlesTest_Errors(msg = "Dec Handle OnUpdate not called 10 times")
                    )
                }
            }
        }
    }
}