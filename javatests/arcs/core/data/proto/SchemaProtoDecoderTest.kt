package arcs.core.data.proto

import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SchemaRegistry
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Decodes the text proto [protoText] for [SchemaProto] as [Schema]. */
fun decodeSchemaProtoText(protoText: String): Schema {
    val builder = SchemaProto.newBuilder()
    TextFormat.getParser().merge(protoText, builder)
    return builder.build().decode()
}

@RunWith(JUnit4::class)
class SchemaProtoDecoderTest {
    @Before
    fun setUp() {
        SchemaRegistry.register(Schema.EMPTY)
    }

    @After
    fun tearDown() {
        SchemaRegistry.clearForTest()
    }

    @Test
    fun roundTrip_schemaNames() {
        // schema Thing Object {}
        val schema = Schema(
            names = setOf(SchemaName("Thing"), SchemaName("Object")),
            fields = SchemaFields.EMPTY,
            hash = "myHash"
        )
        assertThat(schema.encode().decode()).isEqualTo(schema)
    }

    @Test
    fun roundTrip_singletonFields() {
        // {text: Text, bool: Bool}
        val schema = Schema(
            names = emptySet(),
            fields = SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "bool" to FieldType.Boolean
                ),
                collections = emptyMap()
            ),
            hash = "myHash"
        )
        assertThat(schema.encode().decode()).isEqualTo(schema)
    }

    @Test
    fun roundTrip_collectionFields() {
        // {texts: [Text], bools: [Bool]}
        val schema = Schema(
            names = emptySet(),
            fields = SchemaFields(
                singletons = emptyMap(),
                collections = mapOf(
                    "texts" to FieldType.Text,
                    "bools" to FieldType.Boolean
                )
            ),
            hash = "myHash"
        )
        assertThat(schema.encode().decode()).isEqualTo(schema)
    }

    @Test
    fun roundTrip_collectionReferenceFields() {
        // {refs: &{}}
        val schema = Schema(
            names = emptySet(),
            fields = SchemaFields(
                singletons = emptyMap(),
                collections = mapOf(
                    "refs" to FieldType.EntityRef(Schema.EMPTY.hash)
                )
            ),
            hash = "myHash"
        )
        assertThat(schema.encode().decode()).isEqualTo(schema)
    }

    @Test
    fun roundTrip_singletonTupleFields() {
        // {tuple: (Text, Number)}
        val schema = Schema(
            names = emptySet(),
            fields = SchemaFields(
                singletons = mapOf(
                    "tuple" to FieldType.Tuple(FieldType.Text, FieldType.Number)
                ),
                collections = emptyMap()
            ),
            hash = "myHash"
        )
        assertThat(schema.encode().decode()).isEqualTo(schema)
    }

    @Test
    fun roundTrip_collectionTupleFields() {
        // {tuples: [(Text, Number)]}
        val schema = Schema(
            names = emptySet(),
            fields = SchemaFields(
                singletons = emptyMap(),
                collections = mapOf(
                    "tuples" to FieldType.Tuple(FieldType.Text, FieldType.Number)
                )
            ),
            hash = "myHash"
        )
        assertThat(schema.encode().decode()).isEqualTo(schema)
    }
}
