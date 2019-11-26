package wasm.kotlin.tests.arcs

import arcs.Singleton
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime


class EntityClassApiTest(ctor: (String) -> EntityClassApiTest_Errors): TestBase<EntityClassApiTest_Errors>(ctor) {
    private val unused1 = Singleton { EntityClassApiTest_Data() }
    private val unused2 = Singleton { EntityClassApiTest_Empty() }

    init {
        registerHandle("data", unused1)
        registerHandle("empty", unused2)
    }

    /** Run tests on particle initialization */
    override fun init() {
        testFieldMutation()

    }

    @Test
    fun testFieldMutation() {
        val d1 = EntityClassApiTest_Data()

        assertNull("num field is null before it's initialized", d1.num)
        d1.num = 7.3
        assertNotNull("num field is set", d1.num)
        assertEquals("setting num property is successful", 7.3, d1.num)

        assertNull("txt field is null before it's initialized", d1.txt)
        d1.txt = "test"
        assertNotNull("txt field is set", d1.txt)
        assertEquals("setting txt property is successful", "test", d1.txt)

        assertNull("lnk field is null before it's initialized", d1.lnk)
        d1.lnk = "https://google.com"
        assertNotNull("lnk field is set", d1.lnk)
        assertEquals("setting lnk property is successful", "https://google.com", d1.lnk)

        assertNull("flg field is null before it's initialized", d1.flg)
        d1.flg = true
        assertNotNull("flg field is set", d1.flg)
        assertTrue("setting flg property is successful: true", d1.flg as Boolean)
        d1.flg = false
        assertNotNull("flg field is set", d1.flg)
        assertFalse("setting flg property is successful: false", d1.flg as Boolean)
    }

    @Test
    fun testEncodingDecoding() {
        val empty = EntityClassApiTest_Data()
        val emptyStr = empty.encodeEntity()
        val decodedEmpty = EntityClassApiTest_Data().decodeEntity(emptyStr)
        assertEquals("Encoding and Decoding an empty entity results in the same entity", empty, decodedEmpty)

        val full = EntityClassApiTest_Data(num=10.0, txt="20", lnk="https://thirty.net", flg=true)
        val fullStr = full.encodeEntity()
        val decodedFull = EntityClassApiTest_Data().decodeEntity(fullStr)
        assertEquals("Encoding and Decoding an full entity results in the same entity", full, decodedFull)
    }

}


@Retain
@ExportForCppRuntime("_newEntityClassApiTest")
fun constructEntityClassApiTest(): WasmAddress = EntityClassApiTest { txt: String -> EntityClassApiTest_Errors(txt) }.toWasmAddress()
