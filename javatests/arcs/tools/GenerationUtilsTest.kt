package arcs.tools

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class GenerationUtilsTest {
    @Test
    fun list_empty() {
        assertThat(buildCollectionBlock(emptyList<Any>()).toString())
            .isEqualTo("emptyList()")
    }

    @Test
    fun list_single() {
        assertThat(buildCollectionBlock(listOf(1)).toString())
            .isEqualTo("listOf(1)")
    }

    @Test
    fun list_multiple() {
        assertThat(buildCollectionBlock(listOf(1, 2)).toString())
            .isEqualTo("listOf(1, 2)")
    }

    @Test
    fun list_multiple_template() {
        assertThat(buildCollectionBlock(listOf(1, 2), "%S").toString())
            .isEqualTo("""listOf("1", "2")""")
    }

    @Test
    fun list_multiple_builder() {
        assertThat(
            buildCollectionBlock(listOf(1, 2)) { builder, item -> builder.add("%S", item) }
                .toString()
        ).isEqualTo("""listOf("1", "2")""")
    }

    @Test
    fun set_empty() {
        assertThat(buildCollectionBlock(emptySet<Any>()).toString())
            .isEqualTo("emptySet()")
    }

    @Test
    fun set_single() {
        assertThat(buildCollectionBlock(setOf(1)).toString())
            .isEqualTo("setOf(1)")
        assertThat(buildCollectionBlock(setOf(1, 1)).toString())
            .isEqualTo("setOf(1)")
    }

    @Test
    fun set_multiple() {
        assertThat(buildCollectionBlock(setOf(1, 2)).toString())
            .isEqualTo("setOf(1, 2)")
        assertThat(buildCollectionBlock(setOf(1, 2, 1)).toString())
            .isEqualTo("setOf(1, 2)")
    }

    @Test
    fun set_multiple_template() {
        assertThat(buildCollectionBlock(setOf(1, 2), "%S").toString())
            .isEqualTo("""setOf("1", "2")""")
    }

    @Test
    fun set_multiple_builder() {
        assertThat(
            buildCollectionBlock(setOf(1, 2)) { builder, item -> builder.add("%S", item) }
                .toString()
        ).isEqualTo("""setOf("1", "2")""")
    }

    @Test
    fun map_empty() {
        assertThat(buildCollectionBlock(emptyMap<String, Any>()).toString())
            .isEqualTo("emptyMap()")
    }

    @Test
    fun map_single() {
        assertThat(buildCollectionBlock(mapOf("a" to 1)).toString())
            .isEqualTo("""mapOf("a" to 1)""")
        assertThat(buildCollectionBlock(mapOf("a" to 1, "a" to 2)).toString())
            .isEqualTo("""mapOf("a" to 2)""")
    }

    @Test
    fun map_multiple() {
        assertThat(buildCollectionBlock(mapOf("a" to 1, "a" to 2, "b" to 3)).toString())
            .isEqualTo("""mapOf("a" to 2, "b" to 3)""")
        assertThat(buildCollectionBlock(mapOf("a" to 1, "b" to 2)).toString())
            .isEqualTo("""mapOf("a" to 1, "b" to 2)""")
    }

    @Test
    fun map_multiple_template() {
        assertThat(buildCollectionBlock(mapOf("a" to 1, "b" to 2), "%S to %S").toString())
            .isEqualTo("""mapOf("a" to "1", "b" to "2")""")
    }

    @Test
    fun map_multiple_builder() {
        assertThat(
            buildCollectionBlock(mapOf("a" to 1, "b" to 2)) { builder, entry ->
                builder.add("%S to %S", entry.key, entry.value)
            }.toString()
        ).isEqualTo("""mapOf("a" to "1", "b" to "2")""")
    }
}
