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

package arcs.showcase.instant

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.host.toRegistration
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.sdk.ArcsDuration
import arcs.sdk.ArcsInstant
import arcs.showcase.ShowcaseEnvironment
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

class EventsToday : AbstractEventsToday()
class Calendar : AbstractCalendar()

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class InstantShowcaseTest {

    @get:Rule
    val env = ShowcaseEnvironment(
        ::Calendar.toRegistration(),
        ::EventsToday.toRegistration()
    )

    @Test
    fun filteringDates() = runBlocking {
        val arc = env.startArc(ShowEventsTodayPlan)
        arc.waitForStart()

        val calendarParticle: Calendar = env.getParticle<Calendar>(arc)
        val allEvents = calendarParticle.handles.events.dispatchFetchAll()
        assertThat(allEvents).hasSize(3)

        // Launch
        val launchEvent = requireNotNull(allEvents.find { it.name == "Launch" })
        assertThat(launchEvent.start.toString()).isEqualTo("1995-12-15T06:02:00Z")
        assertThat(launchEvent.end.toString()).isEqualTo("1995-12-16T06:02:00Z")

        // Celebration
        val celebrationEvent = requireNotNull(allEvents.find { it.name == "Celebration" })
        assertThat(celebrationEvent.start.toString()).isEqualTo("2019-03-11T01:00:00Z")
        assertThat(celebrationEvent.end.toString()).isEqualTo("2019-03-11T02:00:00Z")

        // TeamMeet
        val teamMeet = requireNotNull(allEvents.find { it.name == "Team Meeting" })

        val anHourFromNow = ArcsInstant.now().plus(ArcsDuration.ofHours(1)).toEpochMilli()
        val twoHoursFromNow = ArcsInstant.now().plus(ArcsDuration.ofHours(2)).toEpochMilli()

        assertThat(teamMeet.start.toEpochMilli() - anHourFromNow).isAtMost(1000)
        assertThat(teamMeet.end.toEpochMilli() - twoHoursFromNow).isAtMost(1000)

        env.arcHost.waitForArcIdle(arc.id.toString())

        val eventsParticle: EventsToday = env.getParticle<EventsToday>(arc)
        val todaysEvents = eventsParticle.handles.events.dispatchFetchAll()

        // TeamMeet
        val teamMeetToday = requireNotNull(todaysEvents.find { it.name == "Team Meeting" })
        assertThat(teamMeetToday.start.toEpochMilli() - anHourFromNow).isAtMost(1000)
        assertThat(teamMeetToday.end.toEpochMilli() - twoHoursFromNow).isAtMost(1000)

        env.stopArc(arc)
    }
}
