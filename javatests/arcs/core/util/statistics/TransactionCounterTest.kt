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
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class TransactionCounterTest {

  @Test
  fun current_forNewInstance_returnsDefaultInitalValue() {
    val transactionCounter = TransactionCounter()

    assertThat(transactionCounter.current).isEqualTo(0)
  }

  @Test
  fun peak_forNewInstance_returnsDefaultInitialValue() {
    val transactionCounter = TransactionCounter()

    assertThat(transactionCounter.peak).isEqualTo(0)
  }

  @Test
  fun current_forNewInstance_returnsCustomInitialValue() {
    val initialCurrentValue = 42
    val transactionCounter = TransactionCounter(initCurrent = initialCurrentValue)

    assertThat(transactionCounter.current).isEqualTo(initialCurrentValue)
  }

  @Test
  fun peak_forNewInstance_returnsCustomInitialValue() {
    val initialPeakValue = 42
    val transactionCounter = TransactionCounter(initPeak = initialPeakValue)

    assertThat(transactionCounter.peak).isEqualTo(initialPeakValue)
  }

  @Test
  fun current_afterInc_isOneGreater() {
    val initialCurrentValue = 42
    val transactionCounter = TransactionCounter(initCurrent = initialCurrentValue)

    transactionCounter.inc()

    assertThat(transactionCounter.current).isEqualTo(initialCurrentValue + 1)
  }

  @Test
  fun peak_afterInc_whenCurrentIsPeak_isOneGreater() {
    val initialCurrentValue = 42
    val initialPeakValue = 42
    val transactionCounter = TransactionCounter(
      initCurrent = initialCurrentValue,
      initPeak = initialPeakValue
    )

    transactionCounter.inc()

    assertThat(transactionCounter.peak).isEqualTo(initialPeakValue + 1)
  }

  @Test
  fun peak_afterInc_whenCurrentIsLessThanPeak_doesNotChange() {
    val initialCurrentValue = 42
    val initialPeakValue = 100
    val transactionCounter = TransactionCounter(
      initCurrent = initialCurrentValue,
      initPeak = initialPeakValue
    )

    transactionCounter.inc()

    assertThat(transactionCounter.peak).isEqualTo(initialPeakValue)
  }

  @Test
  fun current_afterDec_isOneLess() {
    val initialCurrentValue = 42
    val transactionCounter = TransactionCounter(initCurrent = initialCurrentValue)

    transactionCounter.dec()

    assertThat(transactionCounter.current).isEqualTo(initialCurrentValue - 1)
  }

  @Test
  fun peak_afterDec_isUnchanged() {
    val initialCurrentValue = 42
    val initialPeakValue = 43
    val transactionCounter = TransactionCounter(
      initCurrent = initialCurrentValue,
      initPeak = initialPeakValue
    )

    transactionCounter.dec()

    assertThat(transactionCounter.peak).isEqualTo(initialPeakValue)
  }
}
