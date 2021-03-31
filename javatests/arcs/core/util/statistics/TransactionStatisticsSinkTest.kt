/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.util.statistics

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TransactionStatisticsSinkTest {
  class TestTransactionStatisticsSink : TransactionStatisticsSink {
    var traceCalled = false
    var measureCalled = false
    override suspend fun measure(block: suspend () -> Unit) {
      block()
      measureCalled = true
    }

    override suspend fun traceTransaction(tag: String?, block: suspend () -> Unit) {
      block()
      traceCalled = true
    }
  }

  @Test
  fun traceAndMeasure_callsTrace_andMeasure() = runBlockingTest {
    val sink = TestTransactionStatisticsSink()

    sink.traceAndMeasure { }

    assertThat(sink.traceCalled).isTrue()
    assertThat(sink.measureCalled).isTrue()
  }
}
