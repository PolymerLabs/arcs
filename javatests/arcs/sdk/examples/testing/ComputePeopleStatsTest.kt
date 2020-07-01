package arcs.sdk.examples.testing

import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchRemove
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
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
            .that(harness.stats.dispatchFetch()).isNull()
    }

    @Test
    fun onePersonInput() = runTest {
        harness.people.dispatchStore(Person(42.0))
        assertThat(harness.stats.dispatchFetch()?.medianAge).isEqualTo(42.0)
    }

    @Test
    fun twoPersonInput() = runTest {
        harness.people.dispatchStore(Person(10.0), Person(30.0))
        assertWithMessage("Median of two integers should be their mean")
            .that(harness.stats.dispatchFetch()?.medianAge).isEqualTo(20.0)
    }

    @Test
    fun threePersonInput() = runTest {
        harness.people.dispatchStore(Person(10.0), Person(30.0), Person(11.0))
        assertThat(harness.stats.dispatchFetch()?.medianAge).isEqualTo(11)
    }

    @Test
    fun changingInput() = runTest {
        assertThat(harness.stats.dispatchFetch()).isNull()

        var statsUpdateAge = CompletableDeferred<Double?>()
        harness.stats.onUpdate { statsUpdateAge.complete(it?.medianAge) }

        val person20 = Person(20.0)
        statsUpdateAge = CompletableDeferred()
        harness.people.dispatchStore(person20)
        assertThat(statsUpdateAge.await()).isEqualTo(20.0)

        val person30 = Person(30.0)
        statsUpdateAge = CompletableDeferred()
        harness.people.dispatchStore(person30)
        assertThat(statsUpdateAge.await()).isEqualTo(25.0)

        val person26 = Person(26.0)
        statsUpdateAge = CompletableDeferred()
        harness.people.dispatchStore(person26)
        assertThat(statsUpdateAge.await()).isEqualTo(26.0)

        statsUpdateAge = CompletableDeferred()
        harness.people.dispatchRemove(person20)
        assertThat(statsUpdateAge.await()).isEqualTo(28.0)

        statsUpdateAge = CompletableDeferred()
        harness.people.dispatchRemove(person26)
        assertThat(statsUpdateAge.await()).isEqualTo(30.0)

        statsUpdateAge = CompletableDeferred()
        harness.people.dispatchRemove(person30)
        assertThat(statsUpdateAge.await()).isNull()
    }

    private fun runTest(testFn: suspend CoroutineScope.() -> Unit) = runBlocking {
        withTimeout(5000) {
            harness.start()
            testFn()
        }
    }
}
