package arcs.core.tools

import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import com.google.common.truth.Truth.assertThat
import org.junit.Test
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

        assertThat(schemaProperty.toString()).isEqualTo("""val sliceSchema: arcs.core.data.Schema = arcs.core.data.Schema(
    listOf(
        arcs.core.data.SchemaName("Slice")
    ),
    arcs.core.data.SchemaFields(
        singletons = mapOf(
            "num" to arcs.core.data.FieldType.Number,
            "flg" to arcs.core.data.FieldType.Boolean,
            "txt" to arcs.core.data.FieldType.Text
        ),
        collections = mapOf(
        )
    ),
    "f4907f97574693c81b5d62eb009d1f0f209000b8"
    )

""")
    }
}
