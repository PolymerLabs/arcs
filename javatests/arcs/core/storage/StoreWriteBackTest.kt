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

package arcs.core.storage

import com.google.common.truth.Truth.assertThat
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executor
import java.util.concurrent.Executors
import kotlin.random.Random

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class StoreWriteBackTest {

    private lateinit var random: Random
    private lateinit var executor: Executor
    private lateinit var writeBackScope: CoroutineScope
    private lateinit var writeBack: StoreWriteBack

    @Before
    fun setUp() {
        random = Random(System.currentTimeMillis())
        executor = Executors.newCachedThreadPool {
            Thread(it).apply { name = "WriteBack #$id" }
        }
        writeBackScope = CoroutineScope(
            executor.asCoroutineDispatcher() + SupervisorJob()
        )
        StoreWriteBack.init(writeBackScope)
        writeBack = StoreWriteBack.create("testing", forceEnable = true) as StoreWriteBack
    }

    @After
    fun tearDown() {
        writeBackScope.cancel()
    }

    @Test
    fun stressTest_internalDelay() = runBlocking {
        val sum = atomic(0)

        TEST_RANGE.forEach { k ->
            writeBack.asyncFlush {
                random.nextDelay()
                sum.update { it + k }
                random.nextDelay()
            }
        }

        writeBack.awaitIdle()

        assertThat(sum.value).isEqualTo(TEST_RANGE.sum())
    }

    @Test
    fun stressTest_externalDelay() = runBlocking {
        val sum = atomic(0)

        val jobs = mutableListOf<Job>()
        TEST_RANGE.forEach { k ->
            jobs.add(
                launch {
                    random.nextDelay()
                    writeBack.asyncFlush {
                        sum.update { it + k }
                    }
                }
            )
        }

        jobs.joinAll()
        writeBack.awaitIdle()

        assertThat(sum.value).isEqualTo(TEST_RANGE.sum())
    }

    @Test
    fun stressTest_internalExternalDelays() = runBlocking {
        val sum = atomic(0)

        val jobs = mutableListOf<Job>()
        TEST_RANGE.forEach { k ->
            jobs.add(
                launch {
                    random.nextDelay()
                    writeBack.asyncFlush {
                        random.nextDelay()
                        sum.update { it + k }
                        random.nextDelay()
                    }
                }
            )
        }

        jobs.joinAll()
        writeBack.awaitIdle()

        assertThat(sum.value).isEqualTo(TEST_RANGE.sum())
    }

    @Test
    fun orderTest_internalDelay() = runBlocking {
        val output = CopyOnWriteArrayList<Int>()

        TEST_RANGE.forEach {
            writeBack.asyncFlush {
                random.nextDelay()
                output.add(it)
                random.nextDelay()
            }
        }

        writeBack.awaitIdle()

        assertThat(output).isEqualTo(TEST_RANGE.toList())
    }

    companion object {
        private val TEST_RANGE = 1..100

        private suspend fun Random.nextDelay() =
            delay(nextLong(5, 25))
    }
}
