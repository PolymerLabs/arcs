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

import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TransactionStatisticsImplTest {
  private val testTime = FakeTime()
  private val transactionStatisticsImpl = TransactionStatisticsImpl(testTime)

  @Test
  fun measure_whenBlockCompletes_updatesStats() = runBlockingTest {
    testTime.millis = 5678

    // Measure two blocks so that we get a meaningful stddev
    transactionStatisticsImpl.measure {
      testTime.millis += 2000
    }
    transactionStatisticsImpl.measure {
      testTime.millis += 1000
    }

    assertThat(transactionStatisticsImpl.roundtripMean).isEqualTo(1500)
    assertThat(transactionStatisticsImpl.roundtripStdDev).isEqualTo(500)
  }

  @Test
  fun measure_whenBlockThrows_updatesStats() = runBlockingTest {
    testTime.millis = 5678

    try {
      transactionStatisticsImpl.measure {
        testTime.millis += 2000
        throw FakeTestException()
      }
    } catch (e: FakeTestException) {}
    try {
      transactionStatisticsImpl.measure {
        testTime.millis += 1000
        throw FakeTestException()
      }
    } catch (e: FakeTestException) {}

    assertThat(transactionStatisticsImpl.roundtripMean).isEqualTo(1500)
    assertThat(transactionStatisticsImpl.roundtripStdDev).isEqualTo(500)
  }

  @Test
  fun traceTransaction_whenBlockStartsAndCompletes_updatesTransactions() = runBlockingTest {
    transactionStatisticsImpl.traceTransaction {
      assertThat(transactionStatisticsImpl.currentTransactions).isEqualTo(1)
    }

    assertThat(transactionStatisticsImpl.peakTransactions).isEqualTo(1)
    assertThat(transactionStatisticsImpl.currentTransactions).isEqualTo(0)
  }

  @Test
  fun traceTransaction_whenBlockThrows_updatesTransactions() = runBlockingTest {
    try {
      transactionStatisticsImpl.traceTransaction {
        assertThat(transactionStatisticsImpl.currentTransactions).isEqualTo(1)
        throw FakeTestException()
      }
    } catch (e: FakeTestException) {}

    assertThat(transactionStatisticsImpl.peakTransactions).isEqualTo(1)
    assertThat(transactionStatisticsImpl.currentTransactions).isEqualTo(0)
  }

  private class FakeTestException : Exception()
}
