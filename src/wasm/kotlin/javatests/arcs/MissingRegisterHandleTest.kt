package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.wasm.toAddress
import kotlin.native.internal.ExportForCppRuntime

class MissingRegisterHandleTest : Particle()

@Retain
@ExportForCppRuntime("_newMissingRegisterHandleTest")
fun constructMissingRegisterHandleTest() = MissingRegisterHandleTest().toAddress()
