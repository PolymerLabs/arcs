package arcs.sdk.examples.testing

import arcs.core.entity.awaitReady
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/**
 * Example of particle Unit Testing.
 */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class ComputePeopleStatsTest {
    @get:Rule val log = LogRule()
    @get:Rule val harness = ComputePeopleStatsTestHarness { ComputePeopleStats() }

    @Test
    fun emptyInput() = runTest {
        harness.stats.awaitReady()
        withContext(harness.stats.dispatcher) {
            assertWithMessage("Can't compute stats for an empty set")
                .that(harness.stats.fetch()).isNull()
        }
    }

    @Test
    fun onePersonInput() = runTest {
        withContext(harness.people.dispatcher) {
            harness.people.store(Person(42.0))
        }.join()
        withContext(harness.stats.dispatcher) {
            assertThat(harness.stats.fetch()?.medianAge).isEqualTo(42.0)
        }
    }

    @Test
    fun twoPersonInput() = runTest {
        withContext(harness.people.dispatcher) {
            listOf(
                harness.people.store(Person(10.0)),
                harness.people.store(Person(30.0))
            )
        }.joinAll()

        withContext(harness.stats.dispatcher) {
            assertWithMessage("Median of two integers should be their mean")
                .that(harness.stats.fetch()?.medianAge).isEqualTo(20.0)
        }
    }

    @Test
    fun threePersonInput() = runTest {
        withContext(harness.people.dispatcher) {
            listOf(
                harness.people.store(Person(10.0)),
                harness.people.store(Person(30.0)),
                harness.people.store(Person(11.0))
            )
        }.joinAll()
        withContext(harness.stats.dispatcher) {
            assertThat(harness.stats.fetch()?.medianAge).isEqualTo(11)
        }
    }

    @Test
    fun changingInput() = runTest {
        harness.stats.awaitReady()
        withContext(harness.stats.dispatcher) {
            assertThat(harness.stats.fetch()).isNull()
        }

        var statsUpdateAge = CompletableDeferred<Double?>()
        harness.stats.onUpdate { statsUpdateAge.complete(it?.medianAge) }

        withContext(harness.people.dispatcher) {
            val person20 = Person(20.0)
            statsUpdateAge = CompletableDeferred()
            harness.people.store(person20)
            assertThat(statsUpdateAge.await()).isEqualTo(20.0)

            val person30 = Person(30.0)
            statsUpdateAge = CompletableDeferred()
            harness.people.store(person30)
            assertThat(statsUpdateAge.await()).isEqualTo(25.0)

            val person26 = Person(26.0)
            statsUpdateAge = CompletableDeferred()
            harness.people.store(person26)
            assertThat(statsUpdateAge.await()).isEqualTo(26.0)

            statsUpdateAge = CompletableDeferred()
            harness.people.remove(person20)
            assertThat(statsUpdateAge.await()).isEqualTo(28.0)

            statsUpdateAge = CompletableDeferred()
            harness.people.remove(person26)
            assertThat(statsUpdateAge.await()).isEqualTo(30.0)

            statsUpdateAge = CompletableDeferred()
            harness.people.remove(person30)
            assertThat(statsUpdateAge.await()).isNull()
        }
    }

    private fun runTest(testFn: suspend CoroutineScope.() -> Unit) = runBlocking {
        withTimeout(5000) {
            harness.start()
            testFn()
        }
    }
}
