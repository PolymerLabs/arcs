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
import arcs.core.data.Plan
import arcs.core.data.expression.EvaluatorParticle
import arcs.core.data.expression.Expression.Scope
import arcs.core.data.expression.div
import arcs.core.data.expression.eq
import arcs.core.data.expression.from
import arcs.core.data.expression.get
import arcs.core.data.expression.new
import arcs.core.data.expression.on
import arcs.core.data.expression.scope
import arcs.core.data.expression.select
import arcs.core.data.expression.seq
import arcs.core.data.expression.where
import arcs.core.host.toRegistration
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.showcase.ShowcaseEnvironment
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
class ExpressionShowcaseTest {

    @get:Rule
    val env = ShowcaseEnvironment(
        ::DataWriter.toRegistration(),
        ::StatsChecker.toRegistration(),
        ::EvaluatorParticle.toRegistration()
    )

    @Test
    fun expressionEvaluation() = runBlocking {
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

        // TODO(b/163033197): Remove once we can parse expressions from the Manifest
        //  from state in states
        //  from county in counties
        //  where county.stateCode == state.code
        //  select new County {
        //    name: county.name,
        //    state: state.name,
        //    density: county.population / county.areaSqMi,
        //    stateAreaRatio: county.areaSqMi / state.areaSqMi,
        //    statePopulationRatio: county.population / state.population
        //  }
        val calculateStats =
            from("state") on seq<Scope>("states") from("county") on
                seq<Scope>("counties") where (
                scope("county").get<String>("stateCode") eq
                scope("state").get<String>("code")
            ) select new("CountyStats")(
                "name" to scope("county").get<String>("name"),
                "state" to scope("state").get<String>("name"),
                "density" to
                    scope("county").get<Number>("population") /
                    scope("county")["areaSqMi"],
                "stateAreaRatio" to
                    scope("county").get<Number>("areaSqMi") /
                    scope("state")["areaSqMi"],
                "statePopulationRatio" to
                    scope("county").get<Number>("population") /
                    scope("state")["population"]
            )

        // Adds the above expression to the CountiesStatsCalculator.output connection.
        val planWithExpression = Plan.particleLens.mod(StatsCalculationPlan) { particles ->
            particles.map { particle ->
                if (particle.particleName == "CountiesStatsCalculator") {
                    val updated = Plan.Particle.locationLens.set(
                        particle, requireNotNull(EvaluatorParticle::class.qualifiedName))
                    Plan.Particle.handlesLens.mod(updated) { handles ->
                        handles.mapValues { (name, connection) ->
                            if (name == "output") {
                                connection.copy(expression = calculateStats)
                            } else {
                                connection
                            }
                        }
                    }
                } else particle
            }
        }

        val retrievalArc = env.startArc(planWithExpression)
        val stats = env.getParticle<StatsChecker>(retrievalArc).handles.data.dispatchFetchAll()

        assertThat(stats).hasSize(3)

        // San Francisco
        val sfStats = requireNotNull(stats.find { it.name == "San Francisco" })
        assertThat(sfStats.state).isEqualTo("California")
        assertThat(sfStats.density).isWithin(1.0).of(18_756.0)
        assertThat(sfStats.stateAreaRatio).isWithin(.00001).of(.00065)
        assertThat(sfStats.statePopulationRatio).isWithin(.001).of(.022)

        // King
        val kingStats = requireNotNull(stats.find { it.name == "King" })
        assertThat(kingStats.state).isEqualTo("Washington")
        assertThat(kingStats.density).isWithin(1.0).of(1_065.0)
        assertThat(kingStats.stateAreaRatio).isWithin(.001).of(.029)
        assertThat(kingStats.statePopulationRatio).isWithin(.01).of(.29)

        // San Juan
        val juanStats = requireNotNull(stats.find { it.name == "San Juan" })
        assertThat(juanStats.state).isEqualTo("Washington")
        assertThat(juanStats.density).isWithin(1.0).of(101.0)
        assertThat(juanStats.stateAreaRatio).isWithin(.0001).of(.0024)
        assertThat(juanStats.statePopulationRatio).isWithin(.0001).of(0.0023)
    }
}
