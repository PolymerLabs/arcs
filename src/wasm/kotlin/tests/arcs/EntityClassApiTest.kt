package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime


class EntityClassApiTest: Particle() {

}

@Retain
@ExportForCppRuntime("_newEntityClassApiTest")
fun constructEntityClassApiTest(): WasmAddress = MissingRegisterHandleTest().toWasmAddress()