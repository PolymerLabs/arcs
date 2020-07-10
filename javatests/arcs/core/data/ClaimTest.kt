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
class ClaimTest {
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
    fun instantiateAssumeForParticle() {
        val oneSelector = listOf(AccessPath.Selector.Field("bar"))
        val readerConnectionSpec = AccessPath("Reader", connectionSpec, oneSelector)
        val readerConnection = readerConnectionSpec.instantiateFor(particle)
        val assumeSpec = Claim.Assume(
            readerConnectionSpec,
            Predicate.Label(SemanticTag("packageName"))
        )
        val assumeParticle = requireNotNull(assumeSpec.instantiateFor(particle) as? Claim.Assume)
        assertThat(assumeParticle.accessPath).isEqualTo(readerConnection)
    }

    @Test
    fun instantiateDerivesForParticle() {
        val fooSelector = listOf(AccessPath.Selector.Field("foo"))
        val barSelector = listOf(AccessPath.Selector.Field("bar"))
        val readerConnectionFooSpec = AccessPath("Reader", connectionSpec, fooSelector)
        val readerConnectionBarSpec = AccessPath("Reader", connectionSpec, barSelector)
        val readerConnectionFoo = readerConnectionFooSpec.instantiateFor(particle)
        val readerConnectionBar = readerConnectionBarSpec.instantiateFor(particle)
        val derivesSpec = Claim.DerivesFrom(
            target = readerConnectionFooSpec,
            source = readerConnectionBarSpec
        )
        val derivesParticle = requireNotNull(
            derivesSpec.instantiateFor(particle) as? Claim.DerivesFrom
        )
        assertThat(derivesParticle.source).isEqualTo(readerConnectionBar)
        assertThat(derivesParticle.target).isEqualTo(readerConnectionFoo)
    }
}
