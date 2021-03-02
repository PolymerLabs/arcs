@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.nullable

import arcs.jvm.host.TargetHost

@TargetHost(arcs.android.integration.IntegrationHost::class)
class Attending : AbstractAttending() {

  override fun onReady() {
    handles.attending.storeAll(
      handles.invited.fetchAll().filter { it.rsvp == true }.map {
        // Nulls can be propagated
        Guest(name = it.name, employee_id = it.employee_id, rsvp = it.rsvp)
      }
    )
    handles.no_response.storeAll(
      // Nulls can be read & filtered on
      handles.invited.fetchAll().filter { it.rsvp == null }.map {
        Guest(name = it.name, employee_id = it.employee_id, rsvp = it.rsvp)
      }
    )
  }
}
