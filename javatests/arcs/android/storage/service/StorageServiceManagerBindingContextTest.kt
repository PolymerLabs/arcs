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

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [StorageServiceManagerBindingContext]. */
@RunWith(AndroidJUnit4::class)
class StorageServiceManagerBindingContextTest {
    private suspend fun buildContext() = StorageServiceManagerBindingContext(
        coroutineContext,
        BindingContextStatsImpl()
    )

    @Test
    fun sendProxyMessage_propagatesToTheStore() = runBlocking {
        val bindingContext = buildContext()
        val deferredResult = DeferredResult(coroutineContext)
        bindingContext.clearAll(deferredResult)

        assertThat(deferredResult.await()).isTrue()

        coroutineContext[Job.Key]?.cancelChildren()
        Unit
    }
}
