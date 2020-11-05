@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.instant

import arcs.jvm.host.TargetHost
import arcs.sdk.ArcsDuration
import arcs.sdk.ArcsInstant

typealias Agenda = AbstractEventsToday.EventsToday_Agenda

@TargetHost(arcs.android.integration.IntegrationHost::class)
class EventsToday : AbstractEventsToday() {

  override fun onReady() {
    handles.agenda.storeAll(
      handles.events.fetchAll().filter {
        (it.start <= ArcsInstant.now().plus(ArcsDuration.ofDays(1))) &&
          (ArcsInstant.now() <= it.end)
      }.map {
        Agenda(name = it.name, start = it.start, end = it.end)
      }
    )
  }
}
