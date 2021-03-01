@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.duration

import arcs.jvm.host.TargetHost
import arcs.sdk.ArcsDuration
import arcs.sdk.ArcsInstant

typealias Guest = AbstractAttendees.Guest

@TargetHost(arcs.android.integration.IntegrationHost::class)
class Attending : AbstractAttending() {

  override fun onReady() {
    handles.invitees.storeAll(
      handles.attending.fetchAll().filter { it.rsvp == true }.map {
        Guest(name = it.name, start = it.start, length = it.length)
      }
    )
  }
}
