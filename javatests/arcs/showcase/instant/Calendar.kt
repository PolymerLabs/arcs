@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.instant

import arcs.jvm.host.TargetHost
import arcs.sdk.ArcsDuration
import arcs.sdk.ArcsInstant
import arcs.showcase.ShowcaseHost

// LocalDate date = LocalDate.parse("9999-12-31");
// ArcsInstant instant = date.atStartOfDay(ZoneId.of("Europe/Paris")).toInstant();

typealias Event = AbstractCalendar.Event

@TargetHost(ShowcaseHost::class)
class Calendar : AbstractCalendar() {
    override fun onReady() {
        handles.events.storeAll(
            listOf(
                Event(
                    name = "Launch",
                    start = ArcsInstant.ofEpochMilli(819007320000), // 1995-12-15 i.e. not today
                    end = ArcsInstant.ofEpochMilli(819093720000)
                ),
                Event(
                    name = "Celebration",
                    start = ArcsInstant.ofEpochMilli(1552266000000), // 2019-03-11 i.e. not today
                    end = ArcsInstant.ofEpochMilli(1552269600000)
                ),
                Event(
                    name = "Team Meeting",
                    start = ArcsInstant.now().plus(ArcsDuration.ofHours(1)), // today, in 1 hour
                    end = ArcsInstant.now().plus(ArcsDuration.ofHours(2))
                )
            )
        )
    }
}
