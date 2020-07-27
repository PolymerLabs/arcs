package arcs.core.data

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PlanTest {

    @Test
    fun registerSchemas_fromHandle() {
        val targetSchema = Schema(setOf(SchemaName("target")), Schema.EMPTY.fields, "someHash")
        val handle = Plan.Handle(
            CreatableStorageKey("bla"),
            SingletonType(EntityType(targetSchema)),
            emptyList()
        )
        val plan = Plan(emptyList(), listOf(handle), emptyList())

        plan.registerSchemas()

        // TODO(b/154855864) Replace with regular equality test when lambdas are gone
        assertThat(SchemaRegistry.getSchema("someHash").toLiteral())
            .isEqualTo(targetSchema.toLiteral())
    }

    @Test
    fun registerSchemas_fromParticle_general() {
        val handleSchema = Schema(setOf(SchemaName("Foo")), Schema.EMPTY.fields, "handleHash")
        val connectionSchema = Schema(
            setOf(SchemaName("Bar")),
            Schema.EMPTY.fields,
            "connectionHash"
        )

        val handle = Plan.Handle(
            CreatableStorageKey("bla"),
            SingletonType(EntityType(handleSchema)),
            emptyList()
        )
        val handleConnection = Plan.HandleConnection(
            handle = handle,
            mode = HandleMode.ReadWrite,
            type = CollectionType(ReferenceType(EntityType(connectionSchema)))

        )
        val particle = Plan.Particle(
            "someName",
            "someLocation",
            mapOf(
                "data" to handleConnection
            )
        )
        val plan = Plan(listOf(particle), emptyList(), emptyList())

        plan.registerSchemas()

        // TODO(b/154855864) Replace with regular equality test when lambdas are gone
        assertThat(SchemaRegistry.getSchema("handleHash").toLiteral())
            .isEqualTo(handleSchema.toLiteral())
        assertThat(SchemaRegistry.getSchema("connectionHash").toLiteral())
            .isEqualTo(connectionSchema.toLiteral())
        assertThat(SchemaRegistry.getSchema("connectionHash"))
    }

    @Test
    fun registerSchemas_fromParticle_variable() {
        val handleSchema = Schema(setOf(SchemaName("Foo")), Schema.EMPTY.fields, "handleHash")
        val varSchema = Schema(setOf(SchemaName("Baz")), Schema.EMPTY.fields, "varHash")

        val handle = Plan.Handle(
            CreatableStorageKey("bla"),
            SingletonType(EntityType(handleSchema)),
            emptyList()
        )

        val variableHandleConnection = Plan.HandleConnection(
            handle = handle,
            mode = HandleMode.ReadWrite,
            type = CollectionType(TypeVariable("a", EntityType(varSchema)))
        )
        val particle = Plan.Particle(
            "someName",
            "someLocation",
            mapOf(
                "data" to variableHandleConnection
            )
        )
        val plan = Plan(listOf(particle), emptyList(), emptyList())

        plan.registerSchemas()

        // TODO(b/154855864) Replace with regular equality test when lambdas are gone
        assertThat(SchemaRegistry.getSchema("handleHash").toLiteral())
            .isEqualTo(handleSchema.toLiteral())
        assertThat(SchemaRegistry.getSchema("varHash").toLiteral())
            .isEqualTo(varSchema.toLiteral())
    }
}
