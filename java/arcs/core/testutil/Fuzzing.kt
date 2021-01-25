package arcs.core.testutil

import kotlin.random.Random
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.runBlocking

/**
 * This file contains utility classes and methods that establish fuzz-testing infrastructure.
 *
 * # Writing fuzz tests for a unit or assembly
 *
 * 1. think of the invariants that make sense for the thing that you want to test.
 *
 * For example, if you've built a bank account class, then an invariant might be that the balance
 * can never be less than 0. (See below for more information on invariants).
 *
 * 2. express this invariant as a function, ensuring all variables are externalized.
 *
 * An invariant is a statement that's expected to be true, regardless of some context. The idea
 * here is to make sure that the context (as much as possible) is passed into the invariant
 * function, rather than choosing a specific context to test.
 *
 * Note that this is quite distinct from a unit test - when writing a unit test, we want to
 * choose a particular set of inputs and then test that an expected set of outputs result. Here,
 * we're abstracting away from particular inputs and describing something we expect to be true
 * _regardless_ of what's fed in.
 *
 * For our bank account class, we want to run a sequence of transactions against an account and
 * then test that the balance isn't negative. The sequence of transactions and the initial balance
 * are both structure that is incidental to the invariant, so we will make these function
 * parameters:
 *
 * ```kotlin
 * fun invariant_balanceCantGoNegative(initialBalance: Int, transactions: List<Transaction>) {
 *   val account = Account(initialBalance)
 *   val transactionsApplied = transactions.map { account.apply(it) }
 *   assertThat(account.balance).isLargerThan(0)
 * }
 * ```
 *
 * Note that there can be a set of initial assumptions which need to be tested; these are
 * things that we want to be true about the inputs, or how they're related to each other.
 * For example, we would like to assume that the initial balance isn't negative in the
 * function above. These are called preconditions and should be asserted as part of the
 * invariant function, as well as documented in the invariant function's comments.
 *
 * In addition to the preconditions, there will be the body of the invariant (applying
 * the arguments, running the test, etc.); and finally there will be a set of postconditions
 * which need to be asserted.
 *
 * Splitting the above function up gives us:
 *
 * ```kotlin
 * // Given an initialBalance (which must not be negative) and a list of transactions,
 * // the final balance of the account can not be negative.
 * fun invariant_balanceCantGoNegative(initialBalance: Int, transactions: List<Transaction>) {
 *   // Precondition
 *   assertThat(initialBalance).isLargerThan(0)
 *
 *   // Body
 *   val account = Account(initialBalance)
 *   val transactionsApplied = transactions.map { account.apply(it) }
 *
 *   // Postcondition
 *   assertThat(account.balance).isLargerThan(0)
 * }
 * ```
 *
 * Invariant functions should be placed in a file called <Classname>Invariants.kt,
 * in the javatests hierarchy, next to <Classname>Test.kt.
 *
 * 3. reuse or build [Generator]s for the non-required structure
 *
 * [Generator]s produce random variables of a particular type. Multiple [Generator]s can exist
 * for each type, with each [Generator] producing random outputs that are constrained in
 * different ways. [Generator]s are composable, so it's common for a [Generator] to take other
 * [Generator]s as input.
 *
 * Here's a simple [Generator] for non-negative initial balances:
 *
 * ```kotlin
 * class NonNegativeIntGenerator(s: FuzzingRandom): Generator<Int> {
 *   override operator fun invoke(): Int = s.nextInRange(0, Int.MAX_VALUE)
 * }
 * ```
 *
 * `s` is our source of randomness. In this case, we can use it directly to get an
 * integer value.
 *
 * Let's assume we have a simple [Generator] for `Transaction`s too. Note that this [Generator]
 * could build on `NonNegativeIntGenerator`: both withdrawals and deposits would be expected to be
 * non-negative. The pattern for this is to pass [Generators] in as constructor parameters
 * - see [ListOf] below, or [arcs.core.data.PlanParticleGenerator] for examples.
 *
 * 4. Set up a fuzz test.
 *
 * You can create a fuzz test using [runFuzzTest], your [Generator]s, and your invariant.
 * [runFuzzTest] will establish a random seed for you, and print the seed value if your test
 * throws.
 *
 * ```kotlin
 * @Test
 * fuzz_balanceCantGoNegative = runFuzzTest {
 *   invariant_balanceCantGoNegative(NonNegativeIntGenerator(it)(), TransactionGenerator(it)())
 * }
 * ```
 *
 * Note that you can also use the invariant for unit tests.
 *
 * ```kotlin
 * @Test
 * aLargeTransactionWontApply() {
 *   invariant_balanceCantGoNegative(100, listOf(Withdrawal(200)))
 * }
 * ```
 *
 * It's also easy to use invariant functions to test a range of input conditions:
 *
 * ```kotlin
 * @Test
 * aRangeOfStartingBalances_MaintainInvariant() {
 *   ...
 *   listOf(4, 100, 1000, 20, 40, 50).forEach {
 *     invariant_balanceCantGoNegative(it, transactions)
 *   }
 * }
 * ```
 *
 * 5. Capture regressions
 *
 * Finally, you can capture failing fuzz runs explicitly as regression tests. However, note that
 * best practice here is to replace the random generation with the specific failing values.
 * Explicit support to help with doing this will be introduced in a future CL.
 *
 * To capture the regression:
 * ```kotlin
 * @Test
 * regression_balanceCantGoNegative() = runRegressionTest(-35623452) {
 *   invariant_balanceCantGoNegative(NonNegativeIntGenerator(it)(), TransactionGenerator(it)())
 * }
 * ```
 *
 * And then replacing generators with values:
 * ```kotlin
  * @Test
 * regression_balanceCantGoNegative() {
 *   invariant_balanceCantGoNegative(420, Withdrawal(421)) // values extracted from generators
 * }
 * ```
 *
 * # A note on types of invariants
 *
 * Invariants can take many forms. Here's a very non-exhaustive list:
 *  - tautologies (e.g. bank account balance is non-negative) - statements that are always true
 *  - conditional statements (e.g. bank account balance ends up larger if only deposits are
 *    processed) - statements that are true if a precondition is true
 *  - differential statements (e.g. St George bank account balances and Commonwealth bank account
 *    balances end up the same if they start the same and have the same transactions apply)
 *  - metamorphic statements (if some relation holds between input and output, it still holds after
 *    certain transformations). Hard to come up with an example using bank accounts, but maybe: if
 *    the opening balance and magnitude of every transaction is multiplied by a constant factor,
 *    then so is the closing balance?
 */

/**
 * A source of 'T' values. Subclasses may produce the same value every time they're invoked,
 * or they may provide different values each time.
 */
interface Generator<T> {
  operator fun invoke(): T
}

/**
 * An algorithm that uses an 'I' to generate an 'O' - a [Transformer] of 'I' into 'O'.
 *
 * This is used to help encode dependencies in input values for invariants. For example,
 * we might want to state that withdrawals less than the initial balance will apply.
 *
 * We would write such an invariant like this:
 *
 * ```kotlin
 * invariant_withdrawals_lessThan_initialBalance_willApply(
 *   initalBalance: Int,
 *   withdrawal: Withdrawal
 * ) {
 *   assertThat(withdrawal.amount).isLessThan(initialBalance)
 *   val account = Account(initialBalance)
 *   assertThat(account.apply(withdrawal)).isTrue()
 * }
 * ```
 *
 * This is fine for unit testing, but without additional thought using this invariant for fuzz
 * testing will result in the initial assertion failing quite regularly, as random [Generator]s
 * aren't correlated with each other and aren't aware of precondition constraints.
 *
 * We could filter out inputs that don't match the invariant rather than asserting, but with this
 * approach, as the likelihood of randomly generating valid inputs gets smaller, tests either get
 * less useful or take longer to run.
 *
 * Instead, we can generate the second input as dependent on the first:
 *
 * ```kotlin
 * fuzz_withdrawals_lessThan_initialBalance_willApply() = runFuzzTest {
 *   val balance = NonNegativeIntGenerator(it)()
 *   val withdrawalTransformer: Transformer<Int, Withdrawal> = WithdrawalFromBalance()
 *   invariant_withdrawals_lessThan_initialBalance_willApply(balance, withdrawalTransformer(balance))
 * }
 * ```
 *
 * This isn't perfect in that the nature of the dependency still needs to be understood by
 * calling code, but at least it lets the dependency exist in a meaningful way, without forcing
 * a coupling between a specific pair of [Generator]s.
 */
abstract class Transformer<Input, Output> {
  abstract operator fun invoke(i: Input): Output
  fun asGenerator(i: Generator<Input>): Generator<Output> {
    class TransformerAsGenerator : Generator<Output> {
      override operator fun invoke(): Output = this@Transformer.invoke(i())
    }
    return TransformerAsGenerator()
  }
}

/**
 * A source of randomness.
 */
interface FuzzingRandom {
  fun nextDouble(): Double
  fun nextLessThan(max: Int): Int
  fun nextInRange(min: Int, max: Int): Int
  fun nextInt(): Int
}

/**
 * A seeded source of randomness. Will always produce the same sequence of values if given the
 * same seed.
 */
open class SeededRandom(val seed: Long) : FuzzingRandom {
  val random = Random(seed)
  override fun nextDouble(): Double = random.nextDouble()
  override fun nextLessThan(max: Int): Int = random.nextInt(0, max)
  override fun nextInRange(min: Int, max: Int): Int = random.nextInt(min, max + 1)
  override fun nextInt(): Int = random.nextInt()
  fun printSeed() {
    println("Test was run with SeededRandom seed $seed")
  }
}

/**
 * A source of randomness that is seeded by the current date & time.
 */
class DateSeededRandom : SeededRandom(System.currentTimeMillis())

/**
 * A [Generator] that always produces the same, specified value.
 */
class Value<T>(val value: T) : Generator<T> {
  override operator fun invoke(): T = value
}

/**
 * A [Generator] that produces each value in the provided list, in order. This [Generator]
 * restarts from the beginning of the list when all values are exhausted.
 */
class SequenceOf<T>(val values: List<T>) : Generator<T> {
  private var idx = 0
  override operator fun invoke(): T {
    val result = values[idx++]
    if (idx == values.size) {
      idx = 0
    }
    return result
  }
}

/**
 * A [Generator] that randomly chooses from a provided list each time it's invoked.
 */
class ChooseFromList<T>(val s: FuzzingRandom, val values: List<T>) : Generator<T> {
  override operator fun invoke(): T {
    return values[s.nextLessThan(values.size)]
  }
}

/**
 * A [Generator] that randomly produces a list of the provided length, using the provided
 * primitive [Generator].
 */
class ListOf<T>(val generator: Generator<T>, val length: Generator<Int>) : Generator<List<T>> {
  override operator fun invoke(): List<T> {
    return (1..length()).map { generator() }
  }
}

/**
 * A [Generator] that randomly produces a map with the provided number of entries, with keys
 * drawn from the provided key generator and values drawn from the provided value generator.
 */
class MapOf<T, U>(
  val key: Generator<T>,
  val value: Generator<U>,
  val entries: Generator<Int>
) : Generator<Map<T, U>> {
  override operator fun invoke(): Map<T, U> {
    val map = mutableMapOf<T, U>()
    val size = entries()
    while (map.keys.size < size) {
      map.put(key(), value())
    }
    return map
  }
}

/**
 * A [Transformer] that implements a specified function.
 *
 * Taking the following invariant:
 * ```kotlin
 * invariant_withdrawals_lessThan_initialBalance_willApply(
 *   initalBalance: Generator<Int>,
 *   withdrawal: Transformer<Int, Withdrawal>
 * )
 * ```
 *
 * we can call it with an explicit withdrawal function:
 * ```kotlin
 *   invariant_withdrawals_lessThan_initialBalance_willApply(balance, Function { it/2 })
 * ```
 *
 * or even with an explicit value:
 * ```kotlin
 *   invariant_withdrawals_lessThan_initialBalance_willApply(balance, Function { 200 })
 * ```
 */
class Function<I, O>(val f: (i: I) -> O) : Transformer<I, O>() {
  override operator fun invoke(i: I): O = f(i)
}

/**
 * Utility method to provision a fuzz test with a random seed value that is printed out
 * if the test fails.
 */
fun runFuzzTest(
  testBody: suspend CoroutineScope.(s: FuzzingRandom) -> Unit
) = runBlocking {
  val s = DateSeededRandom()
  try {
    testBody(s)
  } catch (e: Throwable) {
    s.printSeed()
    throw e
  }
}

/**
 * Utility method to run a test with a specific specific seed value for the purpose of
 * capturing regressions.
 */
fun runRegressionTest(
  seed: Long,
  testBody: suspend CoroutineScope.(s: FuzzingRandom) -> Unit
) = runBlocking {
  val s = SeededRandom(seed)
  testBody(s)
}
