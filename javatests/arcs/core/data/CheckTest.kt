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

package arcs.core.data

import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.InformationFlowLabel.SemanticTag
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CheckTest {
    private val handle = Recipe.Handle("thing", Recipe.Handle.Fate.CREATE, TypeVariable("thing"))
    private val connectionSpec = HandleConnectionSpec("data", HandleMode.Read, TypeVariable("data"))
    private val connection = Recipe.Particle.HandleConnection(
        connectionSpec,
        handle,
        TypeVariable("thing")
    )
    private val particleSpec = ParticleSpec("Reader", mapOf("data" to connectionSpec), "Location")
    private val particle = Recipe.Particle(particleSpec, listOf(connection))

    @Test
    fun prettyPrintAssertCheck() {
        val check = Claim.Assume(
            AccessPath(
                AccessPath.Root.Store("store"),
                listOf(AccessPath.Selector.Field("field"))
            ),
            Predicate.Label(SemanticTag("packageName"))
        )
        assertThat("$check").isEqualTo("s:store.field is packageName")
    }

    @Test
    fun instantiateForParticle() {
        val oneSelector = listOf(AccessPath.Selector.Field("bar"))
        val readerConnectionSpec = AccessPath("Reader", connectionSpec, oneSelector)
        val readerConnection = readerConnectionSpec.instantiateFor(particle)
        val assertSpec = Check.Assert(
            readerConnectionSpec,
            Predicate.Label(SemanticTag("packageName"))
        )
        val assertParticle = requireNotNull(assertSpec.instantiateFor(particle) as? Check.Assert)
        assertThat(assertParticle.accessPath).isEqualTo(readerConnection)
    }
}
