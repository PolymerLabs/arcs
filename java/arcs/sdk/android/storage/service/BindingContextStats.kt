package arcs.sdk.android.storage.service

import arcs.core.storage.ProxyMessage

/**
 *
 */
interface BindingContextStatisticsSink {
    fun measureProxyMessageProcessing(message: ProxyMessage<*, *, *>, block: () -> Unit)
}

/**
 *
 */
interface BindingContextStatisticsSource {
    val roundtripMean: Double
    val roundtripStdDev: Double

    fun getRoundtripPercentile(percentile: Int): Double {

    }
}

internal class BindingContextStatsImpl() : BindingContextStatisticsSource, BindingContextStatisticsSink {
    override fun measureProxyMessageProcessing(message: ProxyMessage<*, *, *>, block: () -> Unit) {
        val startTime = System.currentTimeMillis()
        try {
            block()
        } finally {
            logDuration(System.currentTimeMillis() - startTime)
        }
    }

    override val roundtripMean: Double
        get() = TODO("not implemented")
    override val roundtripStdDev: Double
        get() = TODO("not implemented")

    private fun logDuration(duration: Long) {

    }
}
