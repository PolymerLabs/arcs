@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.duration

import arcs.jvm.host.TargetHost
import arcs.sdk.ArcsDuration
import arcs.sdk.ArcsInstant

typealias Event = AbstractCalendar.Event

@TargetHost(arcs.android.integration.IntegrationHost::class)
class Calendar : AbstractCalendar() {
  override fun onFirstStart() {
    handles.events.storeAll(
      setOf(
        Event(
          name = "Launch",
          start = ArcsInstant.ofEpochMilli(819007320000), // 1995-12-15 i.e. not today
          length = ArcsDuration.ofDays(1) // Ends 1995-12-16
        ),
        Event(
          name = "Celebration",
          start = ArcsInstant.ofEpochMilli(1552266000000), // 2019-03-11 i.e. not today
          length = ArcsDuration.ofHours(1) // Ends 2019-03-11 + 1 hour
        ),
        Event(
          name = "Team Meeting",
          start = ArcsInstant.now().plus(ArcsDuration.ofHours(1)), // today, in 1 hour
          length = ArcsDuration.ofHours(2) // Ends today, in 3 hours
        )
      )
    )
  }
}
