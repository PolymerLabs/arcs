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

class SpecialSchemaFieldsTest : TestBase<SpecialSchemaFieldsTest_Errors>(
    ::SpecialSchemaFieldsTest_Errors,
    SpecialSchemaFieldsTest_Errors_Spec()
) {
    private val unused = WasmSingletonImpl(
        this, "fields", SpecialSchemaFieldsTest_Fields_Spec()
    )

    /** Run tests on particle initialization */
    override fun init() {
        testLanguageKeywordField()
        testLanguageKeywordEncoding()
        testInternalIdField()
        testInternalIdEncoding()
    }

    @Test
    fun testLanguageKeywordField() {
        val s = SpecialSchemaFieldsTest_Fields()
        assertEquals("Keyword field `for_` should start as assigned Value", "", s.for_)
        val s2 = s.copy(for_ = "for")
        assertEquals("language keyword field copy works", "for", s2.for_)
    }

    @Test
    fun testLanguageKeywordEncoding() {
        val s = SpecialSchemaFieldsTest_Fields(
            for_ = "test",
            internal_id = 0.0,
            internalId_ = 0.0
        )
        val encoding = s.encodeEntity().bytes.toUtf8String()
        assertTrue("The encoding uses the language keyword", encoding.contains("|for:"))
    }

    @Test
    fun testInternalIdField() {
        val s = SpecialSchemaFieldsTest_Fields()
        assertEquals(
            "Keyword field `internalId_` should start as assigned value",
            0.0,
            s.internalId_)
        val s2 = s.copy(internalId_ = 10.0)
        assertEquals("language keyword field copy works", 10.0, s2.internalId_)
        assertNotEquals(
            "The internalId field should be different from the internal identifier",
            s2.internalId_,
            s2.internalId
        )
    }

    @Test
    fun testInternalIdEncoding() {
        val s = SpecialSchemaFieldsTest_Fields(
            for_ = "",
            internal_id = 0.0,
            internalId_ = 10.0
        )
        val encoding = s.encodeEntity().bytes.toUtf8String()
        assertTrue("The encoding uses the keyword 'internalId'", encoding.contains("|internalId:"))
    }
}
