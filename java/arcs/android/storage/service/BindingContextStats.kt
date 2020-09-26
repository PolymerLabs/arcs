/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.storage.service

import arcs.core.util.RunningStatistics
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Defines an object capable of tracking the processing time of proxy message round-trip.
 */
interface BindingContextStatisticsSink {
  suspend fun measure(block: suspend () -> Unit)

  /**
   * Traces a binder transaction which executes [block] and is identified by [tag].
   *
   * This enclosing trace api should be called synchronously for accurate tracing result like
   * entry and exit timestamps which are aligned at UI representation i.e. Chrome tracing UI.
   * If it is called asynchronously i.e. at a coroutine dispatcher, the recorded timestamps will
   * not reflect the actual timing properly, e.g. timestamps are recorded after the corresponding
   * binder thread finished. Besides, the tracked level of binder concurrency will be incorrect.
   */
  suspend fun traceTransaction(tag: String? = null, block: suspend () -> Unit)
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

class BindingContextStatsImpl : BindingContextStatistics {
  private val runningStats = RunningStatistics()
  private val mutex = Mutex()
  override val roundtripMean: Double
    get() = runningStats.mean
  override val roundtripStdDev: Double
    get() = runningStats.standardDeviation
  val transactions: Transactions
    get() = Transactions(_transactions.current, _transactions.peak)

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
    private var _transactions = Transactions()
  }
}

/**
 * Maintains stats and information of transactions at a binding context.
 *
 * Uses the ++ operator for entering a transaction and the -- operator for exiting.
 * Accesses [current] for querying current concurrency level and [peak] for peak concurrency
 * level even seen.
 */
class Transactions(initCurrent: Int = 0, initPeak: Int = 0) {
  private val stats = atomic(TransactionStat(initCurrent, initPeak))
  val current
    get() = stats.value.current
  val peak
    get() = stats.value.peak

  operator fun inc(): Transactions = apply {
    // The atomic TransactionStat update must be done quickly since the nature
    // of atomic<T> is implemented as:
    //   while(_someone_cut_in_my_update_) {
    //     /** redo update (re-visit the update closure) */
    //   }
    // Given that be careful of what will be done at the update closure which may
    // be executed multiple times in practice.
    stats.update { s -> TransactionStat(s.current + 1, maxOf(s.current + 1, s.peak)) }
  }

  operator fun dec(): Transactions = apply {
    stats.update { s -> TransactionStat(s.current - 1, s.peak) }
  }

  /** Tracks current concurrency level at [current] and peak concurrency level at [peak] */
  data class TransactionStat(val current: Int, val peak: Int)
}
