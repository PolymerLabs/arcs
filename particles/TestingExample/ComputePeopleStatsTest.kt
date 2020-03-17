package arcs.unit.test.example

import arcs.sdk.testing.TestingCollection
import arcs.sdk.testing.TestingSingleton
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/**
 * Example of particle Unit Testing.
 */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class ComputePeopleStatsTest {

    @Test
    fun testMedianReactsToInputChanges() = runBlockingTest {
        val particle = ComputePeopleStats()

        val peopleHandle = TestingCollection<ComputePeopleStats_People>(particle, "people")
        val statsHandle = TestingSingleton<ComputePeopleStats_Stats>(particle, "stats")

        assertThat(statsHandle.fetch()).isNull()

        val child = ComputePeopleStats_People(10.0)
        peopleHandle.store(child)
        assertThat(statsHandle.fetch()?.let { it.medianAge }).isEqualTo(10.0)

        peopleHandle.store(ComputePeopleStats_People(50.0))
        assertThat(statsHandle.fetch()?.let { it.medianAge }).isEqualTo(30.0)

        peopleHandle.store(ComputePeopleStats_People(60.0))
        assertThat(statsHandle.fetch()?.let { it.medianAge }).isEqualTo(50.0)

        peopleHandle.remove(child)
        assertThat(statsHandle.fetch()?.let { it.medianAge }).isEqualTo(55.0)

        peopleHandle.clear()
        assertThat(statsHandle.fetch()).isNull()
    }
}
