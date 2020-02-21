package arcs.core.tools

import arcs.core.data.*
import arcs.sdk.wasm.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


@RunWith(JUnit4::class)
class Proto2SchemaTest {

    @Test
    fun schemaGeneration_singleProperty() {

        val testSchema = Schema(
            listOf(SchemaName("Slice")),
            SchemaFields(
                singletons = mapOf(
                    "num" to FieldType.Number,
                    "flg" to FieldType.Boolean,
                    "txt" to FieldType.Text
                ),
                collections = mapOf()
            ),
            "f4907f97574693c81b5d62eb009d1f0f209000b8"
        )

        val p2s = Proto2Schema()
        val schemaProperty = p2s.generateSchemas(listOf(testSchema)).first()

        println(schemaProperty.toString())
        // TODO(alxr): Add asserts
    }
}
