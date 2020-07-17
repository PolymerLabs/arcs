/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.storage.service

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.crdt.toProto
import arcs.core.crdt.CrdtException
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [DeferredResult]. */
@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class DeferredResultTest {
    @Test
    fun test_nullException_resolvesToTrue() = runBlockingTest {
        val deferredResult = DeferredResult(coroutineContext)

        launch {
            delay(1000)
            deferredResult.onResult(exception = null)
        }

        assertThat(deferredResult.await()).isEqualTo(true)
    }

    @Test
    fun test_exception_completesExceptionally() = runBlockingTest {
        val deferredResult = DeferredResult(coroutineContext)

        launch {
            delay(1000)
            deferredResult.onResult(CrdtException("Uh oh!").toProto().toByteArray())
        }

        assertThat(deferredResult.await()).isFalse()
    }
}
