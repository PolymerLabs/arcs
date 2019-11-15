package wasm.kotlin.tests.arcs

import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime


class EntityClassApiTest: TestBase() {

}

@Retain
@ExportForCppRuntime("_newEntityClassApiTest")
fun constructEntityClassApiTest(): WasmAddress = EntityClassApiTest().toWasmAddress()
