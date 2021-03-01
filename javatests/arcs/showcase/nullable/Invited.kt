@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.nullable

import arcs.jvm.host.TargetHost

typealias Guest = AbstractInvited.Guest

@TargetHost(arcs.android.integration.IntegrationHost::class)
class Invited : AbstractInvited() {
  override fun onFirstStart() {
    handles.events.storeAll(
      setOf(
        Guest(
          name = "Launch",
          start = ArcsInstant.ofEpochMilli(819007320000), // 1995-12-15 i.e. not today
          length = ArcsNullable.ofDays(1) // Ends 1995-12-16
        ),
        Guest(
          name = "Celebration",
          start = ArcsInstant.ofEpochMilli(1552266000000), // 2019-03-11 i.e. not today
          length = ArcsNullable.ofHours(1) // Ends 2019-03-11 + 1 hour
        ),
        Guest(
          name = "Team Meeting",
          start = ArcsInstant.now().plus(ArcsNullable.ofHours(1)), // today, in 1 hour
          length = ArcsNullable.ofHours(2) // Ends today, in 3 hours
        )
      )
    )
  }
}
