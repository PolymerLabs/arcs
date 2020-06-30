package arcs.sdk.examples.testing

import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
        assertWithMessage("Can't compute stats for an empty set")
                .that(harness.fetch(harness.stats)).isNull()
    }

    @Test
    fun onePersonInput() = runTest {
        harness.store(harness.people, Person(42.0))
        assertThat(harness.fetch(harness.stats)?.medianAge).isEqualTo(42.0)
    }

    @Test
    fun twoPersonInput() = runTest {
        harness.store(harness.people, Person(10.0), Person(30.0))
        assertWithMessage("Median of two integers should be their mean")
            .that(harness.fetch(harness.stats)?.medianAge).isEqualTo(20.0)
    }

    @Test
    fun threePersonInput() = runTest {
        harness.store(harness.people, Person(10.0), Person(30.0), Person(11.0))
        assertThat(harness.fetch(harness.stats)?.medianAge).isEqualTo(11)
    }

    @Test
    fun changingInput() = runTest {
        assertThat(harness.fetch(harness.stats)).isNull()

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
