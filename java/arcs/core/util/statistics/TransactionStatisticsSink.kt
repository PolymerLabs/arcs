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

package arcs.core.util.statistics

/**
 * Defines an object capable of tracking the processing time of proxy message round-trip.
 */
interface TransactionStatisticsSink {
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

  /** Helper method to call [traceTransaction] and [measure]. */
  suspend fun traceAndMeasure(tag: String? = null, block: suspend () -> Unit) {
    traceTransaction(tag) {
      measure(block)
    }
  }
}
