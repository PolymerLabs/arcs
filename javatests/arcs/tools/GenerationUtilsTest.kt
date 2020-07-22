package arcs.tools

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class GenerationUtilsTest {
    @Test
    fun list_empty() {
        assertThat(emptyList<Any>().toGeneration().toString())
            .isEqualTo("emptyList()")
    }

    @Test
    fun list_single() {
        assertThat(listOf(1).toGeneration().toString())
            .isEqualTo("listOf(1)")
    }

    @Test
    fun list_multiple() {
        assertThat(listOf(1, 2).toGeneration().toString())
            .isEqualTo("listOf(1, 2)")
    }

    @Test
    fun list_multiple_template() {
        assertThat(listOf(1, 2).toGeneration("%S").toString())
            .isEqualTo("""listOf("1", "2")""")
    }

    @Test
    fun list_multiple_builder() {
        assertThat(
            listOf(1, 2)
                .toGeneration { builder, item -> builder.add("%S", item) }
                .toString()
        ).isEqualTo("""listOf("1", "2")""")
    }

    @Test
    fun set_empty() {
        assertThat(emptySet<Any>().toGeneration().toString())
            .isEqualTo("emptySet()")
    }

    @Test
    fun set_single() {
        assertThat(setOf(1).toGeneration().toString())
            .isEqualTo("setOf(1)")
        assertThat(setOf(1, 1).toGeneration().toString())
            .isEqualTo("setOf(1)")
    }

    @Test
    fun set_multiple() {
        assertThat(setOf(1, 2).toGeneration().toString())
            .isEqualTo("setOf(1, 2)")
        assertThat(setOf(1, 2, 1).toGeneration().toString())
            .isEqualTo("setOf(1, 2)")
    }

    @Test
    fun set_multiple_template() {
        assertThat(setOf(1, 2).toGeneration("%S").toString())
            .isEqualTo("""setOf("1", "2")""")
    }

    @Test
    fun set_multiple_builder() {
        assertThat(
            setOf(1, 2)
                .toGeneration { builder, item -> builder.add("%S", item) }
                .toString()
        ).isEqualTo("""setOf("1", "2")""")
    }

    @Test
    fun map_empty() {
        assertThat(emptyMap<String, Any>().toGeneration().toString())
            .isEqualTo("emptyMap()")
    }

    @Test
    fun map_single() {
        assertThat(mapOf("a" to 1).toGeneration().toString())
            .isEqualTo("""mapOf("a" to 1)""")
        assertThat(mapOf("a" to 1, "a" to 2).toGeneration().toString())
            .isEqualTo("""mapOf("a" to 2)""")
    }

    @Test
    fun map_multiple() {
        assertThat(mapOf("a" to 1, "a" to 2, "b" to 3).toGeneration().toString())
            .isEqualTo("""mapOf("a" to 2, "b" to 3)""")
        assertThat(mapOf("a" to 1, "b" to 2).toGeneration().toString())
            .isEqualTo("""mapOf("a" to 1, "b" to 2)""")
    }

    @Test
    fun map_multiple_template() {
        assertThat(mapOf("a" to 1, "b" to 2).toGeneration("%S to %S").toString())
            .isEqualTo("""mapOf("a" to "1", "b" to "2")""")
    }

    @Test
    fun map_multiple_builder() {
        assertThat(
            mapOf("a" to 1, "b" to 2)
                .toGeneration { builder, entry -> builder.add("%S to %S", entry.key, entry.value) }
                .toString()
        ).isEqualTo("""mapOf("a" to "1", "b" to "2")""")
    }
}
