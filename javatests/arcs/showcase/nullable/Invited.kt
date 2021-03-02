@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.showcase.nullable

import arcs.jvm.host.TargetHost

typealias Guest = AbstractInvited.Guest
typealias Name = AbstractInvited.Name

@TargetHost(arcs.android.integration.IntegrationHost::class)
class Invited : AbstractInvited() {
  override fun onFirstStart() {
    handles.invited.storeAll(
      setOf(
        Guest(
          name = Name (
            legal = "Ms. Jane Smith",
            first = "Jane",
            last = "Smith"
          ),
          employee_id = 12345,
          rsvp = true
        ),
        Guest(
          name = Name (
            legal = "Mr. John Smith",
            first = "John",
            middle = "Brian",
            last = "Smith"
          ),
          employee_id = null // Nulls can be explicitly set
          // But do not need to be (rsvp is left unset, and null)
        ),
        Guest(
          name = Name (
            legal = "Walter Bruce Willis",
            first = "Bruce"
          ),
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
        ),
      )
    )
  }
}
