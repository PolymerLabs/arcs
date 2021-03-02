@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.nullable

import arcs.jvm.host.TargetHost

typealias Guest = AbstractInvited.Guest
typealias Name = AbstractInvited.Guest.Name

@TargetHost(arcs.android.integration.IntegrationHost::class)
class Invited : AbstractInvited() {
  override fun onFirstStart() {
    handles.invited.storeAll(
      setOf(
        Guest(
          name = Name {
            legal = "Ms. Jane Smith",
            first_name = "Jane",
            last_name = "Smith"
          }
          employee_id = 30125,
          rsvp = true
        ),
        Guest(
          name = Name {
            legal = "Mr. John Smith",
            first_name = "John",
            last_name = "Smith"
          }
          employee_id = null,
          rsvp = null
        ),
        Guest(
          name = Name {
            legal = "Walter Bruce Willis",
            first_name = "Bruce"
          }
          employee_id = null,
          rsvp = false
        ),
        Guest(
          name = null,
          employee_id = 1,
          rsvp = true
        ),
        Guest(
          name = null,
          employee_id = 2,
          rsvp = false
        )
      )
    )
  }
}
