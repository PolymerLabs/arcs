package arcs.unit.test.example

import arcs.core.storage.api.Handle

/**
 * Particle computing a median age of input people - an example for unit testing.
 */
class ComputePeopleStats : AbstractComputePeopleStats() {

    override suspend fun onHandleUpdate(handle: Handle) {
        if (handle != handles.people) return

        val people = handles.people.fetchAll()

        when {
            people.isEmpty() -> handles.stats.clear()
            else -> handles.stats.store(ComputePeopleStats_Stats(people
                .toList()
                .map { it.age }
                .sorted()
                .let { (it[it.size / 2] + it[(it.size - 1) / 2]) / 2 }
            ))
        }
    }
}
