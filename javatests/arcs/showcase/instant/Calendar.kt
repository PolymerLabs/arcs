@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.instant

import arcs.jvm.host.TargetHost
import arcs.sdk.ArcsInstant
import arcs.sdk.ArcsDuration
import arcs.showcase.ShowcaseHost

// LocalDate date = LocalDate.parse("9999-12-31");
// ArcsInstant instant = date.atStartOfDay(ZoneId.of("Europe/Paris")).toInstant();

typealias Event = AbstractCalendar.Event

@TargetHost(ShowcaseHost::class)
class Calendar : AbstractCalendar() {
    override fun onReady() {
        handles.events.store(
            Event(
                name = "Launch",
                start = ArcsInstant.ofEpochMilli(819007320000),
                end = ArcsInstant.ofEpochMilli(819093720000)
            )
        )
        handles.events.store(
            Event(
                name = "Celebration",
                start = ArcsInstant.ofEpochMilli(1552266000000),
                end = ArcsInstant.ofEpochMilli(1552269600000)
            )
        )
        handles.events.store(
            Event(
                name = "Team Meeting",
                start = ArcsInstant.now().plus(ArcsDuration.ofHours(1)),
                end = ArcsInstant.now().plus(ArcsDuration.ofHours(2))
            )
        )
    }
}
