package arcs.sdk.examples.testing

import arcs.sdk.Handle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

typealias Person = ComputePeopleStats_People
typealias Stats = ComputePeopleStats_Stats

/**
 * Particle computing a median age of input people - an example for unit testing.
 */
class ComputePeopleStats(private val scope: CoroutineScope) : AbstractComputePeopleStats() {

    override suspend fun onHandleSync(handle: Handle, allSynced: Boolean) {
        if (!allSynced) return
        calculateMedian(handles.people.fetchAll())
        handles.people.onUpdate { scope.launch { calculateMedian(it) } }
    }

    suspend fun calculateMedian(people: Set<Person>) = when {
        people.isEmpty() -> handles.stats.clear()
        else -> handles.stats.store(
            Stats(
                people.map { it.age }.sorted().let {
                    (it[it.size / 2] + it[(it.size - 1) / 2]) / 2
                }
            )
        )
    }
}
