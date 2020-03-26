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
class EntityTypeUnionTest {
    // TODO(bgogul): hash for all Schema instances.

    @Test
    fun schemaUnionMergesNames() {
        val emptySchemaFields = SchemaFields(emptyMap(), emptyMap())
        val thingSchema = Schema(
            setOf(SchemaName("Thing"), SchemaName("Another")),
            emptySchemaFields,
            ""
        )
        val objectSchema = Schema(
            setOf(SchemaName("Object"), SchemaName("Thing")),
            emptySchemaFields,
            ""
        )
        val thingObjectSchema = (thingSchema union objectSchema).getOrNull()
        assertThat(thingObjectSchema).isNotNull()
        thingObjectSchema?.let {
            assertThat(it.names).containsExactly(
                SchemaName("Thing"),
                SchemaName("Object"),
                SchemaName("Another")
            )
        }
    }

    @Test
    fun schemaUnionMergesSingletons() {
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
        val result = (textSchema union numberSchema).getOrNull()
        assertThat(result).isNotNull()
        result?.let {
            assertThat(it.names).containsExactly(SchemaName("Example"))
            assertThat(it.fields.singletons).isEqualTo(
                mapOf("text" to FieldType.Text, "number" to FieldType.Number)
            )
        }
    }

    @Test
    fun schemaUnionDetectsIncompatibleFieldTypes() {
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
    fun entityTypeUnionComputesUnionOfSchemas() {
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
        val result = (textEntity union numberEntity).getOrNull()
        assertThat(result).isNotNull()
        result?.let {
            assertThat(it.entitySchema).isEqualTo(numberSchema.union(textSchema).getOrNull())
        }
    }
}
