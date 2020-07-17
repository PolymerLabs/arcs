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
    AbstractEntityClassApiTest::EntityClassApiTest_Errors,
    EntityClassApiTest_Errors
) {
    private val unused1 = WasmSingletonImpl(this, "data", EntityClassApiTest_Data)
    private val unused2 = WasmSingletonImpl(this, "empty", EntityClassApiTest_Empty)

    @Test
    fun testEncodingDecoding() {
        val empty = EntityClassApiTest_Data()
        val encodedEmpty = empty.encodeEntity()
        val decodedEmpty = EntityClassApiTest_Data.decode(encodedEmpty.bytes)
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
        val decodedFull = EntityClassApiTest_Data.decode(encodedFull.bytes)
        assertEquals(
            "Encoding and Decoding an full entity results in the same entity",
            full,
            decodedFull
        )
    }
}
