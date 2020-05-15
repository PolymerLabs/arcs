package arcs.core.analysis

import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import com.google.common.truth.Truth.assertThat
import org.junit.Assert.assertTrue
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class EntityTypeOperationsTest {
    // TODO(b/154235149): hash for all Schema instances.

    @Test
    fun schemaUnion_mergesNames() {
        val emptySchemaFields = SchemaFields(emptyMap(), emptyMap())
        val thingSchema = Schema(
            setOf(SchemaName("Thing"), SchemaName("Another")),
            emptySchemaFields,
            hash = ""
        )
        val objectSchema = Schema(
            setOf(SchemaName("Object"), SchemaName("Thing")),
            emptySchemaFields,
            hash = ""
        )

        val thingObjectSchema = requireNotNull((thingSchema union objectSchema).getOrNull())

        assertThat(thingObjectSchema.names).containsExactly(
            SchemaName("Thing"),
            SchemaName("Object"),
            SchemaName("Another")
        )
    }

    @Test
    fun schemaUnion_mergesSingletons() {
        val textField = SchemaFields(
            mapOf("text" to FieldType.Text),
            emptyMap()
        )
        val numberField = SchemaFields(
            mapOf("number" to FieldType.Number),
            emptyMap()
        )
        val textSchema = Schema(names = emptySet(), fields = textField, hash = "")
        val numberSchema = Schema(names = emptySet(), fields = numberField, hash = "")

        val result = requireNotNull((textSchema union numberSchema).getOrNull())

        assertThat(result.fields.singletons).containsExactly(
            "text", FieldType.Text,
            "number", FieldType.Number
        )
    }

    @Test
    fun schemaUnion_mergesCollections() {
        val textsField = SchemaFields(
            emptyMap(),
            mapOf("texts" to FieldType.Text)
        )
        val numbersField = SchemaFields(
            emptyMap(),
            mapOf("numbers" to FieldType.Number)
        )
        val textSchema = Schema(names = emptySet(), fields = textsField, hash = "")
        val numberSchema = Schema(names = emptySet(), fields = numbersField, hash = "")

        val result = requireNotNull((textSchema union numberSchema).getOrNull())

        assertThat(result.fields.collections).containsExactly(
            "texts", FieldType.Text,
            "numbers", FieldType.Number
        )
    }

    @Test
    fun schemaUnion_rejectsIncompatibleFieldTypes() {
        val textField = SchemaFields(
            mapOf("num_text" to FieldType.Text),
            emptyMap()
        )
        val numberField = SchemaFields(
            mapOf("num_text" to FieldType.Number),
            emptyMap()
        )
        val textSchema = Schema(setOf(SchemaName("Example")), textField, "")
        val numberSchema = Schema(setOf(SchemaName("Example")), numberField, "")
        with(textSchema union numberSchema) {
            assertThat(getFailureReason()).contains("Incompatible types for field 'num_text'")
        }
    }

    @Test
    fun entityTypeUnion_computesUnionOfSchemas() {
        val textField = SchemaFields(
            mapOf("text" to FieldType.Text),
            emptyMap()
        )
        val numberField = SchemaFields(
            mapOf("number" to FieldType.Number),
            emptyMap()
        )
        val textSchema = Schema(setOf(SchemaName("Example")), textField, "")
        val numberSchema = Schema(setOf(SchemaName("Example")), numberField, "")
        val textEntity = EntityType(textSchema)
        val numberEntity = EntityType(numberSchema)

        val result = requireNotNull((textEntity union numberEntity).getOrNull())

        assertThat(result.entitySchema).isEqualTo(
            (numberSchema union textSchema).getOrNull()!!
        )
    }
}
