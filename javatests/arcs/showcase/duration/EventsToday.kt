@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.duration

import arcs.jvm.host.TargetHost
import arcs.sdk.ArcsDuration
import arcs.sdk.ArcsInstant

typealias Agenda = AbstractEventsToday.Event

@TargetHost(arcs.android.integration.IntegrationHost::class)
class EventsToday : AbstractEventsToday() {

  override fun onReady() {
    handles.agenda.storeAll(
      handles.events.fetchAll().filter {
        (it.start <= ArcsInstant.now().plus(ArcsDuration.ofDays(1))) &&
          (ArcsInstant.now() <= it.start.plus(it.length))
      }.map {
        Agenda(name = it.name, start = it.start, length = it.length)
      }
    )
  }
}
