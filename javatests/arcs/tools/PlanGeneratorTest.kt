package arcs.tools

import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PlanGeneratorTest {

    @Test
    fun schema_empty() {
        assertThat(Schema.EMPTY.toGeneration().toString())
            .isEqualTo("""arcs.core.data.Schema.EMPTY""")
    }

    @Test
    fun schema_nameOnly() {
        val schemaGen = Schema(setOf(SchemaName("Foo")), SchemaFields(emptyMap(), emptyMap()), "fooHash")
            .toGeneration()
            .toString()

//        // TODO(alxr): Figure out how to get indentation right so the test can be written like so
//        assertThat(schemaGen).isEqualTo("""
//            arcs.core.data.Schema(
//                names = setOf(arcs.core.data.SchemaName("Foo")),
//                fields = arcs.core.data.SchemaFields(
//                    singletons = emptyMap(),
//                    collections = emptyMap()
//                ),
//                hash = "fooHash"
//            )
//        """.trimIndent())
        assertThat(schemaGen).contains("SchemaName(\"Foo\")")
        assertThat(schemaGen).contains("hash = \"fooHash\"")
    }

    @Test
    fun schema_empty() {
        assertThat(Schema.EMPTY.toGeneration().toString())
            .isEqualTo("""Schema.EMPTY""")
    }

    @Test
    fun schemaFields_empty() {
        assertThat(SchemaFields(emptyMap(), emptyMap()).toGeneration().toString())
            .isEqualTo("""
                arcs.core.data.SchemaFields(
                    singletons = emptyMap(),
                    collections = emptyMap()
                )
            """.trimIndent())
    }

    @Test
    fun schemaFields_singletons() {
        assertThat(
            SchemaFields(singletons = mapOf("sku" to FieldType.Int), collections = emptyMap())
                .toGeneration().toString()
        )
            .isEqualTo("""
                arcs.core.data.SchemaFields(
                    singletons = mapOf("sku" to arcs.core.data.FieldType.Int),
                    collections = emptyMap()
                )
            """.trimIndent())
    }

    @Test
    fun schemaFields_collections() {
        assertThat(
            SchemaFields(emptyMap(), collections = mapOf("bananas" to FieldType.Text))
                .toGeneration().toString()
        )
            .isEqualTo("""
                arcs.core.data.SchemaFields(
                    singletons = emptyMap(),
                    collections = mapOf("bananas" to arcs.core.data.FieldType.Text)
                )
            """.trimIndent())
    }

    @Test
    fun fieldType_primitives() {
        assertThat(FieldType.Boolean.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Boolean")
        assertThat(FieldType.Number.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Number")
        assertThat(FieldType.Text.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Text")
        assertThat(FieldType.Byte.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Byte")
        assertThat(FieldType.Short.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Short")
        assertThat(FieldType.Int.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Int")
        assertThat(FieldType.Long.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Long")
        assertThat(FieldType.Char.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Char")
        assertThat(FieldType.Float.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Float")
        assertThat(FieldType.Double.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.Double")
        assertThat(FieldType.BigInt.toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.BigInt")
    }

    @Test
    fun fieldType_inlineEntity() {
        assertThat(FieldType.InlineEntity("someHash").toGeneration().toString())
            .isEqualTo("""arcs.core.data.FieldType.InlineEntity("someHash")""")
    }

    @Test
    fun fieldType_entityRef() {
        assertThat(FieldType.EntityRef("someHash").toGeneration().toString())
            .isEqualTo("""arcs.core.data.FieldType.EntityRef("someHash")""")
    }

    @Test
    fun fieldType_tuple() {
        assertThat(
            FieldType.Tuple(listOf(FieldType.Number, FieldType.BigInt))
                .toGeneration()
                .toString()
        )
            .isEqualTo(
                "arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Number, arcs.core.data.FieldType.BigInt))"
            )
        assertThat(
            FieldType.Tuple(listOf(FieldType.Char, FieldType.EntityRef("anotherHash")))
                .toGeneration()
                .toString()
        )
            .isEqualTo(
                "arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Char, " +
                    "arcs.core.data.FieldType.EntityRef(\"anotherHash\")))"
            )
        assertThat(
            FieldType.Tuple(
                listOf(
                    FieldType.Tuple(listOf(FieldType.Boolean, FieldType.Byte)),
                    FieldType.EntityRef("anotherHash")
                )
            ).toGeneration().toString()
        )
            .isEqualTo(
                "arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Boolean, arcs.core.data.FieldType.Byte)" +
                    "), arcs.core.data.FieldType.EntityRef(\"anotherHash\")))"
            )
    }

    @Test
    fun fieldType_listOf() {
        assertThat(FieldType.ListOf(FieldType.Boolean).toGeneration().toString())
            .isEqualTo("arcs.core.data.FieldType.ListOf(arcs.core.data.FieldType.Boolean)")
        assertThat(
            FieldType.ListOf(FieldType.EntityRef("yetAnotherHash"))
                .toGeneration()
                .toString())
            .isEqualTo(
                "arcs.core.data.FieldType.ListOf(" +
                    "arcs.core.data.FieldType.EntityRef(\"yetAnotherHash\"))"
            )
    }
}
