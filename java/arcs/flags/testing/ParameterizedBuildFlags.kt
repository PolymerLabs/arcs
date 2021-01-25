package arcs.flags.testing

import arcs.flags.DevModeBuildFlags

/**
 * Testing helper for running tests parameterized by build flags. Generates all combinations of
 * flag values for the requested flags.
 *
 * Use [ParameterizedBuildFlags.of] to generate combinations of flags, and see [BuildFlagsRule] for
 * how to integrate them into your unit tests.
 */
data class ParameterizedBuildFlags(
  /** Map from flag name to value, giving the values to use for the current test. */
  val values: Map<String, Boolean>
) {
  override fun toString() = values.entries.joinToString { (name, value) -> "$name = $value" }

  /** Updates the given [DevModeBuildFlags] using the flag settings. */
  fun applyTo(flags: DevModeBuildFlags) {
    flags.update(values)
  }

  companion object {
    /**
     * Generates every combination of flag settings for the build flags with the given name,
     * returned as an [Iterable]. Each [ParameterizedBuildFlags] instance generated has the given
     * [flags] set to a unique combination of values.
     */
    fun of(vararg flags: String): Iterable<ParameterizedBuildFlags> {
      // Implementation details: Uses N bits to represent the enabled/disabled state of each flag,
      // i.e. flags[i] is enabled iff the i-th bit is 1. Iterates through from 000...0 to 11...1 to
      // generate every unique combination.
      require(flags.isNotEmpty())
      require(flags.size <= 30)
      val n = flags.size
      val limit = 1 shl n // pow(2, n), i.e. one extra bit than we need
      return (0 until limit).asSequence().map { bits ->
        val map = flags.mapIndexed { index, flag ->
          val enabled = bits and (1 shl index) != 0
          flag to enabled
        }.toMap()
        ParameterizedBuildFlags(map)
      }.asIterable()
    }
  }
}
