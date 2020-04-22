package arcs.sdk.examples.testing

import arcs.core.util.TaggedLog
import arcs.sdk.Handle

typealias Person = ComputePeopleStats_People
typealias Stats = ComputePeopleStats_Stats

/**
 * Particle computing a median age of input people - an example for unit testing.
 */
class ComputePeopleStats : AbstractComputePeopleStats() {
    private val log = TaggedLog { "ComputePeopleStats" }

    override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (!allSynced) return
        calculateMedian(handles.people.fetchAll())
        handles.people.onUpdate {
            log.info { "onUpdate: ${it.map(Person::age)}" }
            calculateMedian(it)
        }
    }

    fun calculateMedian(people: Set<Person>) = when {
        people.isEmpty() -> {
            log.debug { "Clearing" }
            handles.stats.clear()
        }
        else -> {
            val newValue = people.map { it.age }.sorted().let {
                (it[it.size / 2] + it[(it.size - 1) / 2]) / 2
            }
            val newStats = Stats(newValue)
            log.debug { "Calculated: $newStats" }
            handles.stats.store(newStats)
        }
    }
}
