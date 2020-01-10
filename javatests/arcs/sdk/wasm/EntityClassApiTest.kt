/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk.wasm

class EntityClassApiTest : TestBase<EntityClassApiTest_Errors>(
    ::EntityClassApiTest_Errors,
    EntityClassApiTest_Errors_Spec()
) {
    private val unused1 = WasmSingleton(this, "data", EntityClassApiTest_Data_Spec())
    private val unused2 = WasmSingleton(this, "empty", EntityClassApiTest_Empty_Spec())

    /** Run tests on particle initialization */
    override fun init() {
        testFieldMutation()
    }

    @Test
    fun testFieldMutation() {
        val d1 = EntityClassApiTest_Data()

        assertEquals("num field is defualt value before it's initialized", 0.0, d1.num)
        assertEquals(
            "Upon init, all fields are not set",
            listOf("num", "txt", "lnk", "flg"),
            d1.getFieldsNotSet()
        )
        d1.num = 7.3
        assertEquals("setting num property is successful", 7.3, d1.num)
        assertFalse("isSet is false before every field is set", d1.isSet())
        assertEquals(
            "After setting num it doesn't appear as a not set field",
            listOf("txt", "lnk", "flg"),
            d1.getFieldsNotSet()
        )

        assertEquals("txt field is default value before it's initialized", "", d1.txt)
        d1.txt = "test"
        assertEquals("setting txt property is successful", "test", d1.txt)
        assertFalse("isSet is false before every field is set", d1.isSet())
        assertEquals(
            "After setting txt it doesn't appear as a not set field",
            listOf("lnk", "flg"),
            d1.getFieldsNotSet()
        )

        assertEquals("lnk field is default value before it's initialized", "", d1.lnk)
        d1.lnk = "https://google.com"
        assertEquals("setting lnk property is successful", "https://google.com", d1.lnk)
        assertFalse("isSet is false before every field is set", d1.isSet())
        assertEquals(
            "After setting lnk it doesn't appear as a not set field",
            listOf("flg"),
            d1.getFieldsNotSet()
        )

        assertEquals("flg field is default value before it's initialized", false, d1.flg)
        d1.flg = true
        assertTrue("setting flg property is successful: true", d1.flg)
        d1.flg = false
        assertNotNull("flg field is set", d1.flg)
        assertFalse("setting flg property is successful: false", d1.flg)
        assertTrue("isSet is true once every field is set", d1.isSet())
        assertEquals(
            "After setting all the fields, getFieldsNotSet() returns an empty list",
            mutableListOf<String>(),
            d1.getFieldsNotSet()
        )
    }

    @Test
    fun testEncodingDecoding() {
        val empty = EntityClassApiTest_Data()
        val encodedEmpty = empty.encodeEntity()
        val decodedEmpty = EntityClassApiTest_Data_Spec().decode(encodedEmpty.bytes)
        assertEquals(
            "Encoding and Decoding an empty entity results in the same entity",
            empty,
            decodedEmpty
        )

        val full = EntityClassApiTest_Data(
            num = 10.0,
            txt = "20",
            lnk = "https://thirty.net",
            flg = true
        )
        val encodedFull = full.encodeEntity()
        val decodedFull = EntityClassApiTest_Data_Spec().decode(encodedFull.bytes)
        assertEquals(
            "Encoding and Decoding an full entity results in the same entity",
            full,
            decodedFull
        )
    }
}
