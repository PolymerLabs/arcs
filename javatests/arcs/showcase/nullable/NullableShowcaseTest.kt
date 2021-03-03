/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.showcase.nullable

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.integration.IntegrationEnvironment
import arcs.core.host.toRegistration
import arcs.core.testutil.handles.dispatchFetchAll
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class NullableShowcaseTest {

  @get:Rule
  val env = IntegrationEnvironment(
    ::Invited.toRegistration(),
    ::Attending.toRegistration()
  )

  @Test
  fun filteringDates() = runBlocking {
    val arc = env.startArc(ShowAttendingPlan)
    arc.waitForStart()

    val invitedParticle: Invited = env.getParticle<Invited>(arc)
    val allInvited = invitedParticle.handles.invited.dispatchFetchAll()
    assertThat(allInvited).hasSize(5)

    val janeSmith = requireNotNull(allInvited.find { it.name?.legal == "Ms. Jane Smith" })
    assertThat(janeSmith.name?.first).isEqualTo("Jane")
    assertThat(janeSmith.name?.middle).isNull()
    assertThat(janeSmith.name?.last).isEqualTo("Smith")
    assertThat(janeSmith.employee_id).isEqualTo(12345)
    assertThat(janeSmith.rsvp).isEqualTo(true)

    val johnSmith = requireNotNull(allInvited.find { it.name?.legal == "Mr. John Smith" })
    assertThat(johnSmith.name?.first).isEqualTo("John")
    assertThat(johnSmith.name?.middle).isEqualTo("Brian")
    assertThat(johnSmith.name?.last).isEqualTo("Smith")
    assertThat(johnSmith.employee_id).isNull()
    assertThat(johnSmith.rsvp).isNull()

    val bruceWillis = requireNotNull(allInvited.find { it.name?.legal == "Walter Bruce Willis" })
    assertThat(bruceWillis.name?.first).isEqualTo("Bruce")
    assertThat(bruceWillis.name?.middle).isNull()
    assertThat(bruceWillis.name?.last).isNull()
    assertThat(bruceWillis.employee_id).isNull()
    assertThat(bruceWillis.rsvp).isEqualTo(false)

    val sergey = requireNotNull(allInvited.find { it.employee_id == 1 })
    assertThat(sergey.name).isNull()
    assertThat(sergey.rsvp).isEqualTo(true)

    val page = requireNotNull(allInvited.find { it.employee_id == 2 })
    assertThat(page.name).isNull()
    assertThat(page.rsvp).isEqualTo(false)

    val attendingParticle: Attending = env.getParticle<Attending>(arc)
    val attendingGuests = attendingParticle.handles.attending.dispatchFetchAll()
    assertThat(attendingGuests).hasSize(2)

    requireNotNull(attendingGuests.find { it.name?.legal == "Ms. Jane Smith" })
    requireNotNull(attendingGuests.find { it.employee_id == 1 })

    val noResponseGuests = attendingParticle.handles.no_response.dispatchFetchAll()
    assertThat(noResponseGuests).hasSize(1)
    requireNotNull(noResponseGuests.find { it.name?.legal == "Mr. John Smith" })

    env.stopArc(arc)
  }
}
