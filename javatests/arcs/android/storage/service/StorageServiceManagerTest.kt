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
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [StorageServiceManager]. */
@RunWith(AndroidJUnit4::class)
class StorageServiceManagerTest {
    private suspend fun buildManager() = StorageServiceManager(coroutineContext)

    @Test
    fun clearAll_clearsAllData() = runBlocking {
        val manager = buildManager()
        val deferredResult = DeferredResult(coroutineContext)
        manager.clearAll(deferredResult)

        assertThat(deferredResult.await()).isTrue()
        // TODO: verify all data is cleared.
        coroutineContext[Job.Key]?.cancelChildren()
        Unit
    }
}
