package arcs.core.util.statistics

/**
 * Defines an object capable of providing statistics about the processing times from binding
 * contexts.
 *
 * **Note:** This makes the assumption that the distribution of processing times is normal.
 */
interface TransactionStatistics {
  val roundtripMean: Double
  val roundtripStdDev: Double
  val roundtripPercentiles: Percentiles
    get() = Percentiles(
      roundtripMean + Z_SCORE_SEVENTY_FIFTH_PERCENTILE * roundtripStdDev,
      roundtripMean + Z_SCORE_NINETIETH_PERCENTILE * roundtripStdDev,
      roundtripMean + Z_SCORE_NINETY_NINTH_PERCENTILE * roundtripStdDev
    )

  data class Percentiles(val seventyFifth: Double, val ninetieth: Double, val ninetyNinth: Double)

  companion object {
    private const val Z_SCORE_SEVENTY_FIFTH_PERCENTILE = 0.675
    private const val Z_SCORE_NINETIETH_PERCENTILE = 1.285
    private const val Z_SCORE_NINETY_NINTH_PERCENTILE = 2.325
  }
}
