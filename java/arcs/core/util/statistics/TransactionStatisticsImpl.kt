package arcs.core.util.statistics

import arcs.core.util.RunningStatistics
import arcs.core.util.Time
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class TransactionStatisticsImpl(
  private val time: Time,
  private val transactions: TransactionCounter = TransactionCounter()
) : TransactionStatistics, TransactionStatisticsSink {
  private val runningStats = RunningStatistics()
  private val mutex = Mutex()
  override val roundtripMean: Double
    get() = runningStats.mean
  override val roundtripStdDev: Double
    get() = runningStats.standardDeviation
  val currentTransactions: Int
    get() = transactions.current
  val peakTransactions: Int
    get() = transactions.peak

  override suspend fun measure(block: suspend () -> Unit) {
    val startTime = time.currentTimeMillis
    try {
      block()
    } finally {
      val duration = (time.currentTimeMillis - startTime).toDouble()
      mutex.withLock { runningStats.logStat(duration) }
    }
  }

  override suspend fun traceTransaction(tag: String?, block: suspend () -> Unit) {
    // TODO(ianchang): Inject Android system traces with [tag]
    transactions.inc()
    try {
      block()
    } finally {
      transactions.dec()
    }
  }
}
