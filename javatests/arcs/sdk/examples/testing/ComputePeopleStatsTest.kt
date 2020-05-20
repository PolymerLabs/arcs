package arcs.sdk.examples.testing

import arcs.core.entity.ReadableHandle
import arcs.core.storage.driver.RamDisk
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.atomicfu.atomic
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Ignore
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
    fun emptyInput() = runBlocking {
        harness.start()
        assertWithMessage("Can't compute stats for an empty set")
            .that(harness.stats.fetch()).isNull()
    }

    @Test
    fun onePersonInput() = runBlocking {
        harness.start()
        var job = launch(start = CoroutineStart.UNDISPATCHED) {
            harness.stats.awaitOnUpdate { true }
        }
        withContext(harness.people.dispatcher) {
            harness.people.store(Person(42.0))
        }
        withTimeout(1500) { job.join() }
        assertThat(harness.stats.fetch()?.medianAge).isEqualTo(42.0)
    }

    @Test
    fun twoPersonInput() = runBlocking {
        harness.start()
        var updates = atomic(0)
        var job = launch(start = CoroutineStart.UNDISPATCHED) {
            harness.stats.awaitOnUpdate { updates.incrementAndGet() == 2 }
        }
        withContext(harness.people.dispatcher) {
            harness.people.store(Person(10.0))
            harness.people.store(Person(30.0))
        }
        withTimeout(1500) { job.join() }

        assertWithMessage("Median of two integers should be their mean")
            .that(harness.stats.fetch()?.medianAge).isEqualTo(20.0)
    }

    @Ignore("b/157167236 - Deflake")
    @Test
    fun threePersonInput() = runBlocking {
        harness.start()
        var updates = atomic(0)
        var job = launch(start = CoroutineStart.UNDISPATCHED) {
            harness.stats.awaitOnUpdate {
                log("Called stats.onUpdate")
                updates.incrementAndGet() == 3
            }
        }
        withContext(harness.people.dispatcher) {
            harness.people.store(Person(10.0))
            harness.people.store(Person(30.0))
            harness.people.store(Person(11.0))
        }
        withTimeout(1500) { job.join() }
        assertThat(harness.stats.fetch()?.medianAge).isEqualTo(11)
    }

    @Test
    fun changingInput() = runBlocking {
        harness.start()
        assertThat(harness.stats.fetch()).isNull()

        var statsUpdateAge = CompletableDeferred<Double?>()
        harness.stats.onUpdate { statsUpdateAge.complete(it?.medianAge) }

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

    private suspend fun ReadableHandle<*>.awaitOnUpdate(predicate: () -> Boolean) =
        suspendCoroutine<Unit> { cont -> onUpdate { if (predicate()) cont.resume(Unit) } }
}
