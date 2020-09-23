@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.instant

import arcs.jvm.host.TargetHost
import arcs.sdk.ArcsDuration
import arcs.sdk.ArcsInstant
import arcs.showcase.ShowcaseHost

typealias Agenda = AbstractEventsToday.EventsToday_Agenda

@TargetHost(ShowcaseHost::class)
class EventsToday : AbstractEventsToday() {

    override fun onReady() {
        handles.events.fetchAll().forEach {
            if (
                (it.start <= ArcsInstant.now().plus(ArcsDuration.ofDays(1))) &&
                (ArcsInstant.now() <= it.end)
            ) {
                handles.agenda.store(
                    Agenda(
                        name = it.name,
                        start = it.start,
                        end = it.end
                    )
                )
            }
        }
    }
}
