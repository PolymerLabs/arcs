package arcs.core.testutil

import kotlin.random.Random
import java.time.LocalDateTime
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.runBlocking

interface A<T> {
  operator fun invoke(): T
}

interface T<I, O> {
  operator fun invoke(i: I): O
}

interface Seed {
  fun nextDouble(): Double
  fun nextLessThan(max: Int): Int
  fun nextInRange(min: Int, max: Int): Int
}

open class SeededRandom(val seed: Int): Seed {
  val random = Random(seed)
  override fun nextDouble(): Double = random.nextDouble()
  override fun nextLessThan(max: Int): Int = random.nextInt(0, max)
  override fun nextInRange(min: Int, max: Int): Int = random.nextInt(min, max + 1)
  fun printSeed() {
    println("Seed was $seed")
  }
}

class DateSeededRandom: SeededRandom(LocalDateTime.now().hashCode()) {
}

class Value<T>(val value: T): A<T> {
  override operator fun invoke(): T = value
}

class ChooseFromList<T>(val s: Seed, val values: List<T>) : A<T> {
  override operator fun invoke(): T {
    return values[s.nextLessThan(values.size)]
  }
}

class ListOf<T>(val generator: A<T>, val length: A<Int>): A<List<T>> {
  override operator fun invoke(): List<T> {
    return (1..length()).map { generator() }
  }
}

class Function<I, O>(val f: (i: I) -> O): T<I, O> {
  override operator fun invoke(i: I): O = f(i)
}

fun runFuzzTest(
  testBody: suspend CoroutineScope.(s: Seed) -> Unit
) = runBlocking {
  val s = DateSeededRandom()
  try {
    testBody(s)
  } catch (e: Throwable) {
    s.printSeed()
    throw e
  }
}
