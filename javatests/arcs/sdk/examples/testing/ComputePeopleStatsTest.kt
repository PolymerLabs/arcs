package arcs.sdk.examples.testing

import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
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

    @get:Rule val harness = ComputePeopleStatsTestHarness { scope -> ComputePeopleStats(scope) }

    @Test
    fun emptyInput() = runBlockingTest {
        harness.start()
        assertWithMessage("Can't compute stats for an empty set")
            .that(harness.stats.fetch()).isNull()
    }

    @Test
    fun onePersonInput() = runBlockingTest {
        harness.people.store(Person(42.0))
        harness.start()
        assertThat(harness.stats.fetch()?.let { it.medianAge }).isEqualTo(42.0)
    }

    @Test
    fun twoPersonInput() = runBlockingTest {
        harness.people.store(Person(10.0))
        harness.people.store(Person(30.0))
        harness.start()
        assertWithMessage("Median of two integers should be their mean")
            .that(harness.stats.fetch()?.let { it.medianAge }).isEqualTo(20.0)
    }

    @Test
    fun threePersonInput() = runBlockingTest {
        harness.people.store(Person(10.0))
        harness.people.store(Person(30.0))
        harness.people.store(Person(11.0))
        harness.start()
        assertThat(harness.stats.fetch()?.let { it.medianAge }).isEqualTo(11)
    }

    @Test
    fun changingInput() = runBlockingTest {
        harness.start()
        assertThat(harness.stats.fetch()).isNull()

        val person20 = Person(20.0)
        harness.people.store(person20)
        assertThat(harness.stats.fetch()?.let { it.medianAge }).isEqualTo(20.0)

        val person30 = Person(30.0)
        harness.people.store(person30)
        assertThat(harness.stats.fetch()?.let { it.medianAge }).isEqualTo(25.0)

        val person26 = Person(26.0)
        harness.people.store(person26)
        assertThat(harness.stats.fetch()?.let { it.medianAge }).isEqualTo(26.0)

        harness.people.remove(person20)
        assertThat(harness.stats.fetch()?.let { it.medianAge }).isEqualTo(28.0)

        harness.people.remove(person26)
        assertThat(harness.stats.fetch()?.let { it.medianAge }).isEqualTo(30.0)

        harness.people.remove(person30)
        assertThat(harness.stats.fetch()?.let { it.medianAge }).isNull()
    }
}
