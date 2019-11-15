package wasm.kotlin.tests.arcs

import arcs.Singleton
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime


class EntityClassApiTest: TestBase() {
    private val unused1 = Singleton { EntityClassApiTest_Data() }
    private val unused2 = Singleton { EntityClassApiTest_Empty() }

    init {
        registerHandle("data", unused1)
        registerHandle("empty", unused2)
    }

    /** Run tests on particle initialization */
    override fun init() {
        fieldMethodsTest()

    }

    @Test
    fun fieldMethodsTest() {

    }

}


@Retain
@ExportForCppRuntime("_newEntityClassApiTest")
fun constructEntityClassApiTest(): WasmAddress = EntityClassApiTest().toWasmAddress()
