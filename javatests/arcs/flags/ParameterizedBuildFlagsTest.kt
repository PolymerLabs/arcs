package arcs.flags

import arcs.flags.testing.ParameterizedBuildFlags
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ParameterizedBuildFlagsTest {

  @Test
  fun of_generatesAllCombinations() {
    val actual = ParameterizedBuildFlags.of("a", "b", "c").toList()
    val expected = listOf(
      ParameterizedBuildFlags(mapOf("a" to false, "b" to false, "c" to false)),
      ParameterizedBuildFlags(mapOf("a" to false, "b" to false, "c" to true)),
      ParameterizedBuildFlags(mapOf("a" to false, "b" to true, "c" to false)),
      ParameterizedBuildFlags(mapOf("a" to false, "b" to true, "c" to true)),
      ParameterizedBuildFlags(mapOf("a" to true, "b" to false, "c" to false)),
      ParameterizedBuildFlags(mapOf("a" to true, "b" to false, "c" to true)),
      ParameterizedBuildFlags(mapOf("a" to true, "b" to true, "c" to false)),
      ParameterizedBuildFlags(mapOf("a" to true, "b" to true, "c" to true))
    )
    assertThat(actual).containsExactlyElementsIn(expected)
  }

  @Test
  fun of_withNoFlags_throws() {
    assertFailsWith<IllegalArgumentException> { ParameterizedBuildFlags.of() }
  }

  @Test
  fun applyTo_updatesGivenFlags() {
    val flags = object : DevModeBuildFlags(
      initialFlags = mapOf("a" to false, "b" to true),
      requiredFlags = emptyMap()
    ) {}
    val parameters = ParameterizedBuildFlags(mapOf("a" to true, "b" to false))

    parameters.applyTo(flags)

    assertThat(flags["a"]).isTrue()
    assertThat(flags["b"]).isFalse()
  }
}
