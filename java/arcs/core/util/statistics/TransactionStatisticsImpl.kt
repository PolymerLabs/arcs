package arcs.core.util.statistics

import arcs.core.util.RunningStatistics
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class TransactionStatisticsImpl : TransactionStatistics, TransactionStatisticsSink {
  private val runningStats = RunningStatistics()
  private val mutex = Mutex()
  override val roundtripMean: Double
    get() = runningStats.mean
  override val roundtripStdDev: Double
    get() = runningStats.standardDeviation
  val transactions: TransactionCounter
    get() = TransactionCounter(_transactions.current, _transactions.peak)

  override suspend fun measure(block: suspend () -> Unit) {
    val startTime = System.currentTimeMillis()
    try {
      block()
    } finally {
      val duration = (System.currentTimeMillis() - startTime).toDouble()
      mutex.withLock { runningStats.logStat(duration) }
    }
  }

  override suspend fun traceTransaction(tag: String?, block: suspend () -> Unit) {
    // TODO(ianchang): Inject Android system traces with [tag]
    _transactions++
    try {
      block()
    } finally {
      _transactions--
    }
  }

  companion object {
    private var _transactions = TransactionCounter()
  }
}
