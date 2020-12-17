package arcs.core.util.statistics

import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update

/**
 * Maintains stats and information of transactions at a binding context.
 *
 * Uses the ++ operator for entering a transaction and the -- operator for exiting.
 * Accesses [current] for querying current concurrency level and [peak] for peak concurrency
 * level even seen.
 */
class TransactionCounter(initCurrent: Int = 0, initPeak: Int = 0) {
  private val stats = atomic(TransactionStat(initCurrent, initPeak))
  val current
    get() = stats.value.current
  val peak
    get() = stats.value.peak

  operator fun inc(): TransactionCounter = apply {
    // The atomic TransactionStat update must be done quickly since the nature
    // of atomic<T> is implemented as:
    //   while(_someone_cut_in_my_update_) {
    //     /** redo update (re-visit the update closure) */
    //   }
    // Given that be careful of what will be done at the update closure which may
    // be executed multiple times in practice.
    stats.update { s -> TransactionStat(s.current + 1, maxOf(s.current + 1, s.peak)) }
  }

  operator fun dec(): TransactionCounter = apply {
    stats.update { s -> TransactionStat(s.current - 1, s.peak) }
  }

  /** Tracks current concurrency level at [current] and peak concurrency level at [peak] */
  data class TransactionStat(val current: Int, val peak: Int)
}
