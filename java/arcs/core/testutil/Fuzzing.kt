package arcs.core.testutil

import java.time.LocalDateTime
import kotlin.random.Random
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.runBlocking

/**
 * This file contains utility classes and methods that establish fuzz-testing infrastructure.
 *
 * To write fuzz tests for a unit or assembly:
 * (1) think of the invariants that make sense for the thing that you want to test.
 *
 * For example, if you've built a bank account class, then an invariant might be that the balance
 * can never be less than 0. (See below for more information on invariants).
 *
 * (2) express this invariant as a function, ensuring all non-required structure is externalized.
 *
 * An invariant is a statement that's expected to be true, regardless of some context. The idea
 * here is to make sure that the context (as much as possible) is passed into the invariant
 * function, rather than choosing a specific context to test.
 *
 * For our bank account class, we want to run a sequence of transactions against an account and
 * then test that the balance isn't negative. The sequence of transactions and the initial balance
 * are both structure that is incidental to the invariant, so we will make these function
 * parameters:
 *
 * fun invariant_balanceCantGoNegative(initialBalance: Int, transactions: List<Transaction>) {
 *   val account = Account(initialBalance)
 *   val transactionsApplied = transactions.map { account.apply(it) }
 *   assertThat(account.balance).isLargerThan(0)
 * }
 *
 * Generally, the invariant will separate out into three pieces: firstly there may be some
 * preconditions that need to be checked (for example, we can't guarantee that the balance
 * will be larger than 0 if the initialBalance is not). Then there will be the body of the
 * invariant (applying the arguments, running the test, etc.); and finally there will be a
 * set of postconditions which need to be asserted.
 *
 * Splitting the above function up gives us:
 *
 * fun invariant_balanceCantGoNegative(initialBalance: Int, transactions: List<Transaction>) {
 *   // PRECONDITION
 *   assertThat(initialBalance).isLargerThan(0)
 *
 *   // BODY
 *   val account = Account(initialBalance)
 *   val transactionsApplied = transactions.map { account.apply(it) }
 *
 *   // POSTCONDITION
 *   assertThat(account.balance).isLargerThan(0)
 * }
 *
 * In order to render these invariants useful, we also need to make sure that we can pass in
 * random *generators* of context, rather than specific values. The interface A<Type> gives us a
 * way of doing this; instances of Type can be recovered from A<Type> by invoking it. This
 * sometimes introduces the need for an additional section in our invariant function that does
 * setup:
 *
 * fun invariant_balanceCantGoNegative(initialBalance: A<Int>, transactions: A<List<Transaction>>)
 * {
 *   // SETUP
 *   val theInitialBalance = initialBalance()
 *
 *   // PRECONDITION
 *   assertThat(theInitialBalance).isLargerThan(0)
 *
 *   // BODY
 *   val account = Account(theInitialBalance)
 *   val transactionsApplied = transactions().map { account.apply(it) }
 *
 *   // POSTCONDITION
 *   assertThat(account.balance).isLargerThan(0)
 * }
 *
 * There are a few reasons to pass the randomness in as a parameter directly, rather than (a)
 * generating random values inside the invariant or (b) generating random values in the invariant
 * caller:
 *   A) it promotes reuse & componentization of generators
 *   B) it allows invariant functions to be used both for unit testing and fuzz testing
 *   C) it lets constraints be built into generators rather than baked into each test
 *   D) it lets dependencies between input values be expressed (to a degree) - see the 'T' class
 *      below for more details.
 *
 * (3) reuse or build generators for the non-required structure
 *
 * Here's a simple generator for non-negative initial balances:
 *
 * class NonNegativeIntGenerator(s: Seed): A<Int> {
 *   override operator fun invoke(): Int = s.nextInRange(0, Int.MAX_VALUE)
 * }
 *
 * 's' is our source of randomness. In this case, we can use it directly to get an
 * integer value.
 *
 * Let's assume we have a simple generator for Transactions too. Note that this generator could
 * build on NonNegativeIntGenerator: both withdrawals and deposits would be expected to be
 * non-negative. The pattern for this is to pass generators in as constructor parameters
 * - see ListOf below, or arcs.core.data.PlanParticleGenerator for examples.
 *
 * (4) set up a fuzz test using runFuzzTest, your generators, and your invariant. runFuzzTest will
 * establish a random seed for you, and print the seed value if your tests throws.
 *
 * @Test
 * fuzz_balanceCantGoNegative = runFuzzTest {
 *   invariant_balanceCantGoNegative(NonNegativeIntGenerator(it), TransactionGenerator(it))
 * }
 *
 * Note that you can also use the invariant for unit tests (the Value class provides an
 * implementation of 'A' for a single explicit value):
 *
 * @Test
 * aLargeTransactionWontApply() {
 *   invariant_balanceCantGoNegative(Value(100), Value(listOf(Withdrawal(200))))
 * }
 *
 * It's also easy to use invariant functions to test a range of input conditions:
 *
 * @Test
 * aRangeOfStartingBalances_MaintainInvariant() {
 *   ...
 *   listOf(4, 100, 1000, 20, 40, 50).forEach {
 *     invariant_balanceCantGoNegative(Value(it), transactions)
 *   }
 * }
 *
 * Finally, you can capture failing fuzz runs explicitly as regression tests:
 *
 * @Test
 * regression_balanceCantGoNegative() {
 *   var seed = SeededRandom(-35623452)
 *   invariant_balanceCantGoNegative(NonNegativeIntGenerator(seed), TransactionGenerator(seed))
 * }
 *
 *
 * A note on types of invariants
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
 *
 * TODO(shanestephens): Add a runRegressionTest function to make reproducing failing fuzz tests
 * even easier.
 */

/**
 * A source of 'T' values. Subclasses may produce the same value every time they're invoked,
 * or they may provide different values each time.
 */
interface A<T> {
  operator fun invoke(): T
}

/**
 * An algorithm that uses an 'I' to generate an 'O' - a Transformer of 'I' into 'O'.
 *
 * This is used to help encode dependencies in input values for invariants. For example,
 * we might want to state that withdrawals less than the initial balance will apply.
 *
 * We could write such an invariant like this:
 *
 * invariant_withdrawals_lessThan_initialBalance_willApply(
 *   initalBalance: A<Int>,
 *   withdrawal: A<Withdrawal>
 * ) {
 *   val theInitialBalance = initialBalance()
 *   val theWithdrawal = withdrawal()
 *   assertThat(theWithdrawal.amount).isLessThan(theInitialBalance)
 *   val account = Account(theInitialBalance)
 *   assertThat(account.apply(theWithdrawal)).isTrue()
 * }
 *
 * This is fine for unit testing, but not for fuzz testing as the initial assertion will fail
 * quite regularly for randomly generated, uncorrelated inputs.
 *
 * We could filter out inputs that don't match the invariant rather than asserting, but with this
 * approach, as the likelihood of randomly generating valid inputs gets smaller, tests either get
 * less useful or take longer to run.
 *
 * Instead, we can represent the second input as dependent on the first:
 *
 * invariant_withdrawals_lessThan_initialBalance_willApply(
 *   initalBalance: A<Int>,
 *   withdrawal: T<Int, Withdrawal>
 * ) {
 *   val theInitialBalance = initialBalance()
 *   val theWithdrawal = withdrawal(theInitialBalance)
 *   assertThat(theWithdrawal.amount).isLessThan(theInitialBalance)
 *   val account = Account(theInitialBalance)
 *   assertThat(account.apply(theWithdrawal)).isTrue()
 * }
 *
 * This isn't perfect in that the nature of the dependency still needs to be understood by
 * calling code, but at least it lets the dependency exist in a meaningful way, without forcing
 * a coupling between a specific pair of generators.
 *
 * The Function class (see below) allows the provision of explicit values when a T is expected.
 */
// TODO(shanestephens): Experiment with using A<Pair<I, O>> as input instead, and a generic
// constructor for A<Pair<I, o>> given A<I> and T<I, O>.
abstract class T<I, O> {
  abstract operator fun invoke(i: I): O
  fun asA(i: A<I>): A<O> {
    class TAsA : A<O> {
      override operator fun invoke(): O = this@T.invoke(i())
    }
    return TAsA()
  }
}

/**
 * A source of randomness.
 */
interface Seed {
  fun nextDouble(): Double
  fun nextLessThan(max: Int): Int
  fun nextInRange(min: Int, max: Int): Int
  fun nextInt(): Int
}

/**
 * A seeded source of randomness. Will always produce the same sequence of values if given the
 * same seed.
 */
open class SeededRandom(val seed: Int) : Seed {
  val random = Random(seed)
  override fun nextDouble(): Double = random.nextDouble()
  override fun nextLessThan(max: Int): Int = random.nextInt(0, max)
  override fun nextInRange(min: Int, max: Int): Int = random.nextInt(min, max + 1)
  override fun nextInt(): Int = random.nextInt()
  fun printSeed() {
    println("Seed was $seed")
  }
}

/**
 * A source of randomness that is seeded by the current date & time.
 */
class DateSeededRandom : SeededRandom(LocalDateTime.now().hashCode())

/**
 * A generator (implementation of [A<T>]) that always produces the same, specified value.
 */
class Value<T>(val value: T) : A<T> {
  override operator fun invoke(): T = value
}

/**
 * A generator (implementation of [A<T>]) that produces each value in the provided list,
 * in order. This generator restarts from the beginning of the list when all values are
 * exhausted.
 */
class SequenceOf<T>(val values: List<T>) : A<T> {
  var idx = 0
  override operator fun invoke(): T {
    val result = values[idx++]
    if (idx == values.size) {
      idx = 0
    }
    return result
  }
}

/**
 * A generator (implementation of [A<T>]) that randomly chooses from a provided list each time
 * it's invoked.
 */
class ChooseFromList<T>(val s: Seed, val values: List<T>) : A<T> {
  override operator fun invoke(): T {
    return values[s.nextLessThan(values.size)]
  }
}

/**
 * A generator (implementation of [A<List<T>>]) that randomly produces a list of the provided
 * length, using the provided generator).
 */
class ListOf<T>(val generator: A<T>, val length: A<Int>) : A<List<T>> {
  override operator fun invoke(): List<T> {
    return (1..length()).map { generator() }
  }
}

/**
 * A generator (implementation of [A<Map<T, U>>]) that randomly produces a map with the provided
 * number of entries, with keys drawn from the provided key generator and values drawn from
 * the provided value generator.
 */
class MapOf<T, U>(val key: A<T>, val value: A<U>, val entries: A<Int>) : A<Map<T, U>> {
  override operator fun invoke(): Map<T, U> {
    val keys: MutableSet<T> = mutableSetOf<T>()
    val map = mutableMapOf<T, U>()
    val size = entries()
    while (keys.size < size) {
      keys.add(key())
    }
    keys.forEach {
      map.put(it, value())
    }
    return map
  }
}

/**
 * A transformer (implementation of [T<I, O>]) that implements a specified function.
 *
 * Taking the following invariant:
 * invariant_withdrawals_lessThan_initialBalance_willApply(
 *   initalBalance: A<Int>,
 *   withdrawal: T<Int, Withdrawal>
 * )
 *
 * we can call it with an explicit withdrawal function:
 *   invariant_withdrawals_lessThan_initialBalance_willApply(balance, Function { it/2 })
 *
 * or even with an explicit value:
 *   invariant_withdrawals_lessThan_initialBalance_willApply(balance, Function { 200 })
 */
class Function<I, O>(val f: (i: I) -> O) : T<I, O>() {
  override operator fun invoke(i: I): O = f(i)
}

/**
 * Utility method to provision a fuzz test with a random seed value that's printed out
 * if the test fails.
 */
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
