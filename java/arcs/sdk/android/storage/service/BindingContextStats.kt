package arcs.sdk.android.storage.service

import androidx.annotation.VisibleForTesting
import arcs.core.util.RunningStatistics
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Defines an object capable of tracking the processing time of proxy message round-trip.
 */
interface BindingContextStatisticsSink {
    fun measure(context: CoroutineContext, block: suspend () -> Unit)
}

/**
 * Defines an object capable of providing statistics about the processing times from binding
 * contexts.
 *
 * **Note:** This makes the assumption that the distribution of processing times is normal.
 */
interface BindingContextStatistics : BindingContextStatisticsSink {
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

@VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
class BindingContextStatsImpl : BindingContextStatistics {
    private val runningStats = RunningStatistics()
    private val mutex = Mutex()
    override val roundtripMean: Double
        get() = runningStats.mean
    override val roundtripStdDev: Double
        get() = runningStats.standardDeviation

    override fun measure(context: CoroutineContext, block: suspend () -> Unit) {
        val startTime = System.currentTimeMillis()
        CoroutineScope(context).launch {
            try {
                block()
            } finally {
                val duration = (System.currentTimeMillis() - startTime).toDouble()
                mutex.withLock { runningStats.logStat(duration) }
            }
        }
    }
}
