package arcs.core.analysis

import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.util.Result
import arcs.core.util.getOrNull
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.Message.Builder
import com.google.protobuf.Message
import com.google.protobuf.TextFormat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class EntityTypeUnionTest {
    @Test
    fun schemaUnionMergesNames() {
        val emptySchemaFields = SchemaFields(emptyMap(), emptyMap())
        // TODO(bgogul): hash
        val thingSchema = Schema(
            listOf(SchemaName("Thing"), SchemaName("Another")),
            emptySchemaFields,
            ""
        )
        val objectSchema = Schema(
            listOf(SchemaName("Object"), SchemaName("Thing")),
            emptySchemaFields,
            ""
        )
        val thingObjectSchema = thingSchema.union(objectSchema).getOrNull()
        assertThat(thingObjectSchema).isNotNull()
        thingObjectSchema?.let {
            assertThat(it.names).containsExactly(
                SchemaName("Thing"),
                SchemaName("Object"),
                SchemaName("Another")
            )
        }
    }
}
