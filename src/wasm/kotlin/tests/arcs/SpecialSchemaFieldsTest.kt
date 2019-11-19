package wasm.kotlin.tests.arcs

import arcs.Singleton
import arcs.WasmAddress
import kotlin.native.internal.ExportForCppRuntime
import kotlin.test.assertFalse


class SpecialSchemaFieldsTest(ctor: (String) -> SpecialSchemaFieldsTest_Errors) : TestBase<SpecialSchemaFieldsTest_Errors>(ctor) {
    private val unused = Singleton { SpecialSchemaFieldsTest_Fields() }

    init {
        registerHandle("fields", unused)
    }

    /** Run tests on particle initialization */
    override fun init() {
        testLanguageKeywordField()
//        testLanguageKeywordEncoding()
    }

    @Test
    fun testLanguageKeywordField() {
        val s = SpecialSchemaFieldsTest_Fields()
        assertNull("Keyword field `_for` should start as null", s.for_)
        s.for_ = "for"
        assertEquals("language keyword field gets is mutable", "for", s.for_)
    }

    @Test
    fun testLanguageKeywordEncoding() {
        val s = SpecialSchemaFieldsTest_Fields(for_="test")
        val encoding: String = s.encodeEntity()
        assertTrue("The encoding uses the language keyword", encoding.contains("for"))
        assertEquals("msg", "something", encoding)
    }

    @Test
    fun testInternalIdField() {

    }
}


@Retain
@ExportForCppRuntime("_newSpecialSchemaFieldsTest")
fun constructSpecialSchemaFieldsTest(): WasmAddress = SpecialSchemaFieldsTest { txt: String -> SpecialSchemaFieldsTest_Errors(txt) }.toWasmAddress()

