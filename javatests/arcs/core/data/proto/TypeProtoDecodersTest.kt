package arcs.core.data.proto

import arcs.core.data.CollectionType
import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SchemaRegistry
import arcs.core.data.SingletonType
import arcs.core.data.TupleType
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import kotlin.test.assertFailsWith
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Parses a given proto text as [TypeProto]. */
fun parseTypeProtoText(protoText: String): TypeProto {
    val builder = TypeProto.newBuilder()
    TextFormat.getParser().merge(protoText, builder)
    return builder.build()
}

@RunWith(JUnit4::class)
class TypeProtoDecodersTest {
    @Before
    fun setUp() {
        SchemaRegistry.register(DUMMY_ENTITY_TYPE.entitySchema)
    }

    @After
    fun tearDown() {
        SchemaRegistry.clearForTest()
    }

    @Test
    fun roundTrip_primitiveFieldType() {
        assertThat(FieldType.Text.encode().decodeAsFieldType()).isEqualTo(FieldType.Text)
        assertThat(FieldType.Boolean.encode().decodeAsFieldType()).isEqualTo(FieldType.Boolean)
        assertThat(FieldType.Number.encode().decodeAsFieldType()).isEqualTo(FieldType.Number)
        assertThat(FieldType.Byte.encode().decodeAsFieldType()).isEqualTo(FieldType.Byte)
        assertThat(FieldType.Short.encode().decodeAsFieldType()).isEqualTo(FieldType.Short)
        assertThat(FieldType.Int.encode().decodeAsFieldType()).isEqualTo(FieldType.Int)
        assertThat(FieldType.Long.encode().decodeAsFieldType()).isEqualTo(FieldType.Long)
        assertThat(FieldType.Char.encode().decodeAsFieldType()).isEqualTo(FieldType.Char)
        assertThat(FieldType.Float.encode().decodeAsFieldType()).isEqualTo(FieldType.Float)
        assertThat(FieldType.Double.encode().decodeAsFieldType()).isEqualTo(FieldType.Double)

        val e = assertFailsWith<IllegalArgumentException> { FieldType.Text.encode().decode() }
        assertThat(e).hasMessageThat().isEqualTo("Cannot decode FieldType PRIMITIVE to Type.")
    }

    @Test
    fun roundTrip_listFieldType() {
        val type = FieldType.ListOf(FieldType.Text)
        assertThat(type.encode().decodeAsFieldType()).isEqualTo(type)

        val e = assertFailsWith<IllegalArgumentException> { type.encode().decode() }
        assertThat(e).hasMessageThat().isEqualTo("Cannot decode FieldType LIST to Type.")
    }

    @Test
    fun roundTrip_entityType() {
        // schema Person {name: Text, luckyNumbers: [Number]}
        val type = EntityType(
            Schema(
                names = setOf(SchemaName("Person")),
                fields = SchemaFields(
                    singletons = mapOf("name" to FieldType.Text),
                    collections = mapOf("luckyNumbers" to FieldType.Number)
                ),
                hash = "abc"
            )
        )
        assertThat(type.encode().decode()).isEqualTo(type)

        val e = assertFailsWith<IllegalArgumentException> { type.encode().decodeAsFieldType() }
        assertThat(e).hasMessageThat().isEqualTo(
            "Cannot decode non-inline entities to FieldType.InlineEntity"
        )
    }

    @Test
    fun roundTrip_inlineEntityFieldType() {
        val type = FieldType.InlineEntity(DUMMY_ENTITY_HASH)
        assertThat(type.encode().decodeAsFieldType()).isEqualTo(type)

        val e = assertFailsWith<IllegalArgumentException> { type.encode().decode() }
        assertThat(e).hasMessageThat().isEqualTo("Cannot decode inline entities to EntityType.")
    }

    @Test
    fun roundTrip_singletonType() {
        val type = SingletonType(DUMMY_ENTITY_TYPE)
        assertThat(type.encode().decode()).isEqualTo(type)

        val e = assertFailsWith<IllegalArgumentException> { type.encode().decodeAsFieldType() }
        assertThat(e).hasMessageThat().isEqualTo(
            "Cannot decode non-field type SINGLETON to FieldType."
        )
    }

    @Test
    fun roundTrip_collectionType() {
        val type = CollectionType(DUMMY_ENTITY_TYPE)
        assertThat(type.encode().decode()).isEqualTo(type)

        val e = assertFailsWith<IllegalArgumentException> { type.encode().decodeAsFieldType() }
        assertThat(e).hasMessageThat().isEqualTo(
            "Cannot decode non-field type COLLECTION to FieldType."
        )
    }

    @Test
    fun roundTrip_referenceType() {
        val type = ReferenceType(DUMMY_ENTITY_TYPE)
        assertThat(type.encode().decode()).isEqualTo(type)
    }

    @Test
    fun roundTrip_referenceFieldType() {
        val type = FieldType.EntityRef(DUMMY_ENTITY_HASH)
        assertThat(type.encode().decodeAsFieldType()).isEqualTo(type)
    }

    @Test
    fun roundTrip_countType() {
        val type = CountType()
        assertThat(type.encode().decode()).isEqualTo(type)
    }

    @Test
    fun roundTrip_tupleType() {
        // (Person {name: Text}, Age {value: Number})
        val type = TupleType(
            EntityType(
                Schema(
                    names = setOf(SchemaName("Person")),
                    fields = SchemaFields(
                        singletons = mapOf("name" to FieldType.Text),
                        collections = mapOf()
                    ),
                    hash = ""
                )
            ),
            EntityType(
                Schema(
                    names = setOf(SchemaName("Age")),
                    fields = SchemaFields(
                        singletons = mapOf("value" to FieldType.Number),
                        collections = mapOf()
                    ),
                    hash = ""
                )
            )
        )
        assertThat(type.encode().decode()).isEqualTo(type)
    }

    @Test
    fun roundTrip_tupleFieldType() {
        val type = FieldType.Tuple(FieldType.Text, FieldType.Number)
        assertThat(type.encode().decodeAsFieldType()).isEqualTo(type)
    }

    @Test
    fun roundTrip_variableType_constrained() {
        val type = TypeVariable("a", DUMMY_ENTITY_TYPE)
        assertThat(type.encode().decode()).isEqualTo(type)

        val e = assertFailsWith<IllegalArgumentException> { type.encode().decodeAsFieldType() }
        assertThat(e).hasMessageThat().isEqualTo(
            "Cannot decode non-field type VARIABLE to FieldType."
        )
    }

    @Test
    fun roundTrip_variableType_unconstrained() {
        val type = TypeVariable("a")
        assertThat(type.encode().decode()).isEqualTo(type)

        val e = assertFailsWith<IllegalArgumentException> { type.encode().decodeAsFieldType() }
        assertThat(e).hasMessageThat().isEqualTo(
            "Cannot decode non-field type VARIABLE to FieldType."
        )
    }

    companion object {
        private const val DUMMY_ENTITY_HASH = "DUMMY_ENTITY_HASH"

        private val DUMMY_ENTITY_TYPE = EntityType(
            Schema(
                names = setOf(SchemaName("Dummy")),
                fields = SchemaFields(
                    singletons = emptyMap(),
                    collections = emptyMap()
                ),
                hash = DUMMY_ENTITY_HASH
            )
        )
    }
}
