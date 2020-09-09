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
package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.Claim
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.TypeVariable
import arcs.core.data.expression.asExpr
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ClaimDeductionTests {

    private val handle0 = Recipe.Handle("thing", Recipe.Handle.Fate.CREATE, TypeVariable("thing"))
    private val handle1 = Recipe.Handle("thang", Recipe.Handle.Fate.CREATE, TypeVariable("thang"))
    private val connectionSpec0 = HandleConnectionSpec(
        "data",
        HandleMode.Read,
        TypeVariable("data")
    )
    private val connectionSpec1 = HandleConnectionSpec(
        "output",
        HandleMode.Query,
        TypeVariable("data"),
        0.asExpr() // Dummy Expression

    )
    private val connection0 = Recipe.Particle.HandleConnection(
        connectionSpec0,
        handle0,
        TypeVariable("thing")
    )
    private val connection1 = Recipe.Particle.HandleConnection(
        connectionSpec1,
        handle1,
        TypeVariable("thang")
    )
    private val particleSpec = ParticleSpec(
        "Processor",
        mapOf(
            "data" to connectionSpec0,
            "output" to connectionSpec1
        ),
        "Location")
    private val particle = Recipe.Particle(particleSpec, listOf(connection0, connection1))
    private val oneSelector = listOf(AccessPath.Selector.Field("foo"))
    private val multipleSelectors = listOf(
        AccessPath.Selector.Field("foo"),
        AccessPath.Selector.Field("bar")
    )

    /**
     * Test of claim derivation, roughly equivalent to the following ParticleSpec (particle has
     * a few errors, but is fine for this test).
     *
     * particle Processor
     *   input: reads ~data
     *   output: writes ~data = new Object {foo: input.foo, bar: input.foo.bar}
     *
     *   claim output.foo derives from input.foo
     *   claim output.foo.bar derives from input.foo
     *      and derives from input.foo.bar
     */
    @Test
    fun toClaims_simpleAssociations() {
        val inputFoo = AccessPath(particle, connectionSpec0, oneSelector)
        val inputFooBar = AccessPath(particle, connectionSpec0, multipleSelectors)
        val outputFoo = AccessPath(particle, connectionSpec1, oneSelector)
        val outputFooBar = AccessPath(particle, connectionSpec1, multipleSelectors)

        val actual = mapOf(
            outputFoo to listOf(inputFoo),
            outputFooBar to listOf(inputFoo, inputFooBar)
        ).toClaims()

        assertThat(actual).isEqualTo(
            listOf(
                Claim.DerivesFrom(outputFoo, inputFoo),
                Claim.DerivesFrom(outputFooBar, inputFoo),
                Claim.DerivesFrom(outputFooBar, inputFooBar)
            )
        )
    }
}
