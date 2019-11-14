package wasm.kotlin.tests.arcs

import arcs.Particle
import arcs.Collection
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime


class EntityClassApiTest: ParticleAsserter() {

}

@Retain
@ExportForCppRuntime("_newEntityClassApiTest")
fun constructEntityClassApiTest(): WasmAddress = EntityClassApiTest().toWasmAddress()
