/*
 * Copyright 2020 Google LLC.
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
    ::Calendar.toRegistration(),
    ::EventsToday.toRegistration()
  )

  @Test
  fun filteringDates() = runBlocking {
    val arc = env.startArc(ShowEventsTodayPlan)
    arc.waitForStart()

    env.waitForArcIdle(arc.id.toString())

    val calendarParticle: Calendar = env.getParticle<Calendar>(arc)
    val allEvents = calendarParticle.handles.events.dispatchFetchAll()
    assertThat(allEvents).hasSize(3)

    // Launch
    val launchEvent = requireNotNull(allEvents.find { it.name == "Launch" })
    assertThat(launchEvent.start.toString()).isEqualTo("1995-12-15T06:02:00Z")
    assertThat(launchEvent.length.toMillis()).isEqualTo(86400000)

    // Celebration
    val celebrationEvent = requireNotNull(allEvents.find { it.name == "Celebration" })
    assertThat(celebrationEvent.start.toString()).isEqualTo("2019-03-11T01:00:00Z")
    assertThat(celebrationEvent.length.toMillis()).isEqualTo(3600000)

    // TeamMeet
    val teamMeet = requireNotNull(allEvents.find { it.name == "Team Meeting" })

    val anHourFromNow = ArcsInstant.now().plus(ArcsDuration.ofHours(1)).toEpochMilli()
    val twoHours = ArcsDuration.ofHours(2).toMillis()

    assertThat(teamMeet.start.toEpochMilli() - anHourFromNow).isAtMost(1000)
    assertThat(teamMeet.length.toMillis() - twoHours).isAtMost(1000)

    val eventsParticle: EventsToday = env.getParticle<EventsToday>(arc)
    val todaysEvents = eventsParticle.handles.agenda.dispatchFetchAll()
    assertThat(todaysEvents).hasSize(1)

    // TeamMeet
    val teamMeetToday = requireNotNull(todaysEvents.find { it.name == "Team Meeting" })
    assertThat(teamMeetToday.start.toEpochMilli() - anHourFromNow).isAtMost(1000)
    assertThat(teamMeetToday.length.toMillis() - twoHours).isAtMost(1000)

    env.stopArc(arc)
  }
}
