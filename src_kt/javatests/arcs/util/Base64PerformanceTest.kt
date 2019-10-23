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

package arcs.util

import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import java.security.SecureRandom
import java.util.concurrent.Executors
import java.util.concurrent.ThreadFactory
import java.util.concurrent.TimeUnit
import kotlin.system.measureNanoTime

/**
 * Performance comparison tests between Arcs' implementation of Base64-encoding/decoding and Java's.
 */
@Ignore // Remove to run manually. (Disabled because of unpredictable perf characteristics in CI.)
@RunWith(Parameterized::class)
class Base64PerformanceTest {
  private val random = SecureRandom()
  private val javaEncoder = java.util.Base64.getEncoder()
  private val javaDecoder = java.util.Base64.getDecoder()

  @Parameterized.Parameter
  lateinit var bytes: ByteArray

  @Test
  fun testKotlinVsJava() = runBlocking {
    // Runs more iterations for shorter byte arrays, fewer for longer byte arrays.
    val iterations = 2000 * (100 - bytes.size + 1)

    val arcsTime = async(DISPATCHER) {
      measureNanoTime {
        repeat(iterations) {
          random.nextBytes(bytes)
          arcsEncodeDecode(bytes)
        }
      }
    }

    val javaTime = async(DISPATCHER) {
      measureNanoTime {
        repeat(iterations) {
          random.nextBytes(bytes)
          javaEncodeDecode(bytes)
        }
      }
    }

    assertWithMessage(
      "Arcs implementation should be no more than 0.02ms per cycle slower Java's on average"
    ).that(
      (arcsTime.await() - javaTime.await()).toDouble() / iterations
    ).isLessThan(
      TimeUnit.MICROSECONDS.toNanos(20).toDouble()
    )
  }

  private fun arcsEncodeDecode(byteArray: ByteArray) {
    Base64.decode(Base64.encode(byteArray), gottaGoFast = true)
  }

  private fun javaEncodeDecode(byteArray: ByteArray) {
    javaDecoder.decode(javaEncoder.encodeToString(byteArray))
  }

  companion object {
    private val DISPATCHER = Executors.newFixedThreadPool(2) {
      Thread(it).apply { priority = Thread.MAX_PRIORITY }
    }.asCoroutineDispatcher()

    @Parameterized.Parameters(name = "Base64Performance: {index}-element ByteArray")
    @JvmStatic
    fun arrays(): Collection<ByteArray> = (0..100).map(::ByteArray)
  }
}
