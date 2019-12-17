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
import arcs.utf8ToString
import arcs.addressable.toAddress
import kotlin.native.Retain
import kotlin.native.internal.ExportForCppRuntime

class SpecialSchemaFieldsTest(
    ctor: (String) -> SpecialSchemaFieldsTest_Errors
) : TestBase<SpecialSchemaFieldsTest_Errors>(ctor) {
    private val unused = Singleton(this, "fields") { SpecialSchemaFieldsTest_Fields(
        for_ = "",
        internal_id = 0.0,
        internalId_ = 0.0
    ) }

    /** Run tests on particle initialization */
    override fun init() {
        testLanguageKeywordField()
        testLanguageKeywordEncoding()
        testInternalIdField()
        testInternalIdEncoding()
    }

    @Test
    fun testLanguageKeywordField() {
        val s = SpecialSchemaFieldsTest_Fields(
            for_ = "",
            internal_id = 0.0,
            internalId_ = 0.0
        )
        assertEquals("Keyword field `for_` should start as assigned Value", "", s.for_)
        s.for_ = "for"
        assertEquals("language keyword field gets is mutable", "for", s.for_)
    }

    @Test
    fun testLanguageKeywordEncoding() {
        val s = SpecialSchemaFieldsTest_Fields(
            for_ = "test",
            internal_id = 0.0,
            internalId_ = 0.0
        )
        val encoding = s.encodeEntity().bytes.utf8ToString()
        assertTrue("The encoding uses the language keyword", encoding.contains("|for:"))
    }

    @Test
    fun testInternalIdField() {
        val s = SpecialSchemaFieldsTest_Fields(
            for_ = "",
            internal_id = 0.0,
            internalId_ = 0.0
        )
        assertEquals(
            "Keyword field `internalId_` should start as assigned value",
            0.0,
            s.internalId_)
        s.internalId_ = 10.0
        assertEquals("language keyword field gets is mutable", 10.0, s.internalId_)
        assertNotEquals(
            "The internalId field should be different from the internal identifier",
            s.internalId_,
            s.internalId
        )
    }

    @Test
    fun testInternalIdEncoding() {
        val s = SpecialSchemaFieldsTest_Fields(
            for_ = "",
            internal_id = 0.0,
            internalId_ = 10.0
        )
        val encoding = s.encodeEntity().bytes.utf8ToString()
        assertTrue("The encoding uses the keyword 'internalId'", encoding.contains("|internalId:"))
    }
}

@Retain
@ExportForCppRuntime("_newSpecialSchemaFieldsTest")
fun constructSpecialSchemaFieldsTest() = SpecialSchemaFieldsTest { txt: String ->
    SpecialSchemaFieldsTest_Errors(txt)
}.toAddress()
