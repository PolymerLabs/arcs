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

package sdk.kotlin.javatests.arcs

import arcs.Singleton
import arcs.addressable.toAddress
import kotlin.native.Retain
import kotlin.native.internal.ExportForCppRuntime

class EntityClassApiTest(ctor: (String) -> EntityClassApiTest_Errors) :
    TestBase<EntityClassApiTest_Errors>(ctor) {
    private val unused1 = Singleton(this, "data") { EntityClassApiTest_Data(
        num = 0.0,
        txt = "",
        lnk = "",
        flg = false
    ) }
    private val unused2 = Singleton(this, "empty") { EntityClassApiTest_Empty() }

    /** Run tests on particle initialization */
    override fun init() {
        testFieldMutation()
    }

    @Test
    fun testFieldMutation() {
        val d1 = EntityClassApiTest_Data(
            num = 0.0,
            txt = "",
            lnk = "",
            flg = false
        )

        assertEquals("num field is defualt value before it's initialized", 0.0, d1.num)
        d1.num = 7.3
        assertEquals("setting num property is successful", 7.3, d1.num)

        assertEquals("txt field is default value before it's initialized", "", d1.txt)
        d1.txt = "test"
        assertEquals("setting txt property is successful", "test", d1.txt)

        assertEquals("lnk field is default value before it's initialized", "", d1.lnk)
        d1.lnk = "https://google.com"
        assertEquals("setting lnk property is successful", "https://google.com", d1.lnk)

        assertEquals("flg field is default value before it's initialized", false, d1.flg)
        d1.flg = true
        assertTrue("setting flg property is successful: true", d1.flg)
        d1.flg = false
        assertNotNull("flg field is set", d1.flg)
        assertFalse("setting flg property is successful: false", d1.flg)
    }

    @Test
    fun testEncodingDecoding() {
        val empty = EntityClassApiTest_Data(
            num = 0.0,
            txt = "",
            lnk = "",
            flg = false
        )
        val encodedEmpty = empty.encodeEntity()
        val decodedEmpty = EntityClassApiTest_Data(
            num = 10.0,
            txt = "20",
            lnk = "https://thirty.net",
            flg = true
        ).decodeEntity(encodedEmpty.bytes)
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
        val decodedFull = EntityClassApiTest_Data(
            num = 10.0,
            txt = "20",
            lnk = "https://thirty.net",
            flg = true
        ).decodeEntity(encodedFull.bytes)
        assertEquals(
            "Encoding and Decoding an full entity results in the same entity",
            full,
            decodedFull
        )
    }
}

@Retain
@ExportForCppRuntime("_newEntityClassApiTest")
fun constructEntityClassApiTest() = EntityClassApiTest { txt: String ->
    EntityClassApiTest_Errors(txt)
}.toAddress()
