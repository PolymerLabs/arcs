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

package arcs.showcase.expression

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.data.expression.EvaluatorParticle
import arcs.core.host.toRegistration
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.showcase.ShowcaseEnvironment
import arcs.showcase.expression.innerjoin.AbstractDataWriter
import arcs.showcase.expression.innerjoin.AbstractStatsChecker
import arcs.showcase.expression.innerjoin.DataIngestionPlan
import arcs.showcase.expression.innerjoin.StatsCalculationPlan
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

class StatsChecker : AbstractStatsChecker()
class DataWriter : AbstractDataWriter()

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class InnerJoinTest {

    @get:Rule
    val env = ShowcaseEnvironment(
        ::DataWriter.toRegistration(),
        ::StatsChecker.toRegistration(),
        ::EvaluatorParticle.toRegistration()
    )

    @Test
    fun innerJoin() = runBlocking {
        env.startArc(DataIngestionPlan)
        val writerParticle = env.getParticle<DataWriter>(DataIngestionPlan)

        writerParticle.handles.states.dispatchStore(
            AbstractDataWriter.State(
                name = "California",
                code = "CA",
                areaSqMi = 71_362.0,
                population = 39_512_223.0
            ),
            AbstractDataWriter.State(
                name = "Washington",
                code = "WA",
                areaSqMi = 71_362.0,
                population = 7_614_893.0
            )
        )

        writerParticle.handles.counties.dispatchStore(
            AbstractDataWriter.County(
                name = "San Francisco",
                stateCode = "CA",
                areaSqMi = 47.0,
                population = 881_549.0
            ),
            AbstractDataWriter.County(
                name = "King",
                stateCode = "WA",
                areaSqMi = 2_115.0,
                population = 2_252_782.0
            ),
            AbstractDataWriter.County(
                name = "San Juan",
                stateCode = "WA",
                areaSqMi = 174.0,
                population = 17_582.0
            ),
            AbstractDataWriter.County(
                name = "New York",
                stateCode = "NY",
                areaSqMi = 34.0,
                population = 1_585_873.0
            )
        )

        val retrievalArc = env.startArc(StatsCalculationPlan)
        val stats = env.getParticle<StatsChecker>(retrievalArc).handles.data.dispatchFetchAll()

        assertThat(stats).hasSize(3)

        val sfStats = requireNotNull(stats.find { it.name == "San Francisco" })
        assertThat(sfStats.state).isEqualTo("California")
        assertThat(sfStats.density).isWithin(1.0).of(18_756.0)
        assertThat(sfStats.stateAreaRatio).isWithin(.00001).of(.00065)
        assertThat(sfStats.statePopulationRatio).isWithin(.001).of(.022)

        val kingStats = requireNotNull(stats.find { it.name == "King" })
        assertThat(kingStats.state).isEqualTo("Washington")
        assertThat(kingStats.density).isWithin(1.0).of(1_065.0)
        assertThat(kingStats.stateAreaRatio).isWithin(.001).of(.029)
        assertThat(kingStats.statePopulationRatio).isWithin(.01).of(.29)

        val juanStats = requireNotNull(stats.find { it.name == "San Juan" })
        assertThat(juanStats.state).isEqualTo("Washington")
        assertThat(juanStats.density).isWithin(1.0).of(101.0)
        assertThat(juanStats.stateAreaRatio).isWithin(.0001).of(.0024)
        assertThat(juanStats.statePopulationRatio).isWithin(.0001).of(0.0023)
    }
}
