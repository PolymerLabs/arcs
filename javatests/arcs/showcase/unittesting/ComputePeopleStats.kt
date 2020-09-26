package arcs.showcase.unittesting

import arcs.core.util.TaggedLog

/**
 * Particle computing a median age of input people - an example for unit testing.
 */
class ComputePeopleStats : AbstractComputePeopleStats() {
  private val log = TaggedLog { "ComputePeopleStats" }

  override fun onStart() {
    handles.people.onUpdate {
      val people = handles.people.fetchAll()
      log.info { "onUpdate: ${people.map(Person::age)}" }
      calculateMedian(people)
    }
  }

  override fun onReady() {
    calculateMedian(handles.people.fetchAll())
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
