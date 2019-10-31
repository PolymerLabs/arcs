package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime


class MissingRegisterHandleTest : Particle() {}

@Retain
@ExportForCppRuntime("_newMissingRegisterHandleTest")
fun constructMissingRegisterHandleTest(): WasmAddress = MissingRegisterHandleTest().toWasmAddress()