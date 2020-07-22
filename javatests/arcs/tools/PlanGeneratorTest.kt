package arcs.tools

import arcs.core.data.FieldType
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PlanGeneratorTest {

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
        assertThat(FieldType.Tuple(listOf(FieldType.Number, FieldType.BigInt)).toGeneration().toString())
            .isEqualTo(
                "arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Number, arcs.core.data.FieldType.BigInt))"
            )
        assertThat(FieldType.Tuple(listOf(FieldType.Char, FieldType.EntityRef("anotherHash"))).toGeneration().toString())
            .isEqualTo(
                "arcs.core.data.FieldType.Tuple(" +
                    "listOf(arcs.core.data.FieldType.Char, arcs.core.data.FieldType.EntityRef(\"anotherHash\")))"
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
        assertThat(FieldType.ListOf(FieldType.EntityRef("yetAnotherHash")).toGeneration().toString())
            .isEqualTo(
                "arcs.core.data.FieldType.ListOf(arcs.core.data.FieldType.EntityRef(\"yetAnotherHash\"))"
            )
    }
}
