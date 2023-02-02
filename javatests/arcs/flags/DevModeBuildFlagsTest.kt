package arcs.flags

import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class DevModeBuildFlagsTest {
  @Test
  fun init_unknownRequiredFlagKey_throws() {
    val e = assertFailsWith<IllegalArgumentException> {
      createFlags(
        initialFlags = mapOf("a" to false, "b" to false),
        requiredFlags = mapOf("a" to listOf("unknown"))
      )
    }
    assertThat(e).hasMessageThat().isEqualTo("Invalid flag named 'unknown'.")
  }

  @Test
  fun init_unknownRequiredFlagValue_throws() {
    val e = assertFailsWith<IllegalArgumentException> {
      createFlags(
        initialFlags = mapOf("a" to false, "b" to false),
        requiredFlags = mapOf("unknown" to listOf("b"))
      )
    }
    assertThat(e).hasMessageThat().isEqualTo("Invalid flag named 'unknown'.")
  }

  @Test
  fun init_requiredFlagsViolation_throws() {
    val e = assertFailsWith<IllegalArgumentException> {
      createFlags(
        initialFlags = mapOf("a" to true, "b" to false),
        requiredFlags = mapOf("a" to listOf("b"))
      )
    }
    assertThat(e).hasMessageThat().isEqualTo("Flag 'a' requires flag 'b' to be enabled.")
  }

  @Test
  fun get_returnsValue() {
    val flags = createFlags(mapOf("a" to false, "b" to true))

    assertThat(flags["a"]).isFalse()
    assertThat(flags["b"]).isTrue()
  }

  @Test
  fun get_unknownFlag_throws() {
    val flags = createFlags(emptyMap())

    val e = assertFailsWith<IllegalArgumentException> { flags["unknown"] }
    assertThat(e).hasMessageThat().isEqualTo("Invalid flag named 'unknown'.")
  }

  @Test
  fun set_updatesValue() {
    val flags = createFlags(mapOf("a" to false, "b" to true))

    flags["a"] = true
    flags["b"] = false

    assertThat(flags["a"]).isTrue()
    assertThat(flags["b"]).isFalse()
  }

  @Test
  fun set_unknownFlag_throws() {
    val flags = createFlags(emptyMap())

    val e = assertFailsWith<IllegalArgumentException> { flags["unknown"] = false }
    assertThat(e).hasMessageThat().isEqualTo("Invalid flag named 'unknown'.")
  }

  @Test
  fun set_requiredFlagDisabled_throws() {
    val flags = createFlags(
      initialFlags = mapOf("a" to false, "b" to false),
      requiredFlags = mapOf("a" to listOf("b"))
    )

    val e = assertFailsWith<IllegalArgumentException> { flags["a"] = true }
    assertThat(e).hasMessageThat().isEqualTo("Flag 'a' requires flag 'b' to be enabled.")
  }

  @Test
  fun set_requiredFlagEnabled_updatesValue() {
    val flags = createFlags(
      initialFlags = mapOf("a" to false, "b" to true),
      requiredFlags = mapOf("a" to listOf("b"))
    )

    flags["a"] = true

    assertThat(flags["a"]).isTrue()
  }

  @Test
  fun update_updatesGivenValues() {
    val flags = createFlags(mapOf("a" to false, "b" to true, "c" to false))

    flags.update(mapOf("a" to true, "b" to false))

    assertThat(flags["a"]).isTrue()
    assertThat(flags["b"]).isFalse()
    assertThat(flags["c"]).isFalse()
  }

  @Test
  fun update_unknownFlag_throws() {
    val flags = createFlags(emptyMap())
    val e = assertFailsWith<IllegalArgumentException> { flags.update(mapOf("unknown" to true)) }
    assertThat(e).hasMessageThat().isEqualTo("Invalid flag named 'unknown'.")
  }

  @Test
  fun update_withRequiredFlagViolation_throws() {
    val flags = createFlags(
      initialFlags = mapOf("a" to false, "b" to true),
      requiredFlags = mapOf("a" to listOf("b"))
    )

    val e = assertFailsWith<IllegalArgumentException> {
      flags.update(mapOf("a" to true, "b" to false))
    }
    assertThat(e).hasMessageThat().isEqualTo("Flag 'a' requires flag 'b' to be enabled.")
  }

  @Test
  fun update_withoutRequiredFlagViolation_updatesGivenValues() {
    val flags = createFlags(
      initialFlags = mapOf("a" to false, "b" to false),
      requiredFlags = mapOf("a" to listOf("b"))
    )

    flags.update(mapOf("a" to true, "b" to true))

    assertThat(flags["a"]).isTrue()
    assertThat(flags["b"]).isTrue()
  }

  @Test
  fun reset_restoresOriginalValues() {
    val flags = createFlags(mapOf("a" to false, "b" to true))
    flags["a"] = true
    flags["b"] = false

    flags.reset()

    assertThat(flags["a"]).isFalse()
    assertThat(flags["b"]).isTrue()
  }

  @Test
  fun delegatedProperties() {
    val flags = object : DevModeBuildFlags(
      initialFlags = mapOf("XYZ" to true),
      requiredFlags = emptyMap()
    ) {
      var XYZ: Boolean by this
    }
    assertThat(flags.XYZ).isTrue()
    flags.XYZ = false
    assertThat(flags.XYZ).isFalse()
  }

  private companion object {
    private fun createFlags(
      initialFlags: Map<String, Boolean>,
      requiredFlags: Map<String, List<String>> = emptyMap()
    ): DevModeBuildFlags {
      return object : DevModeBuildFlags(initialFlags, requiredFlags) {}
    }
  }
}
