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

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class AccessPathTest {
    private val handle = Recipe.Handle("thing",  Recipe.Handle.Fate.CREATE, TypeVariable("thing"))
    private val connectionSpec = HandleConnectionSpec("data", HandleMode.Read, TypeVariable("data"))
    private val connection = Recipe.Particle.HandleConnection(connectionSpec, handle)
    private val particleSpec = ParticleSpec("Reader", mapOf("data" to connectionSpec), "Location")
    private val particle = Recipe.Particle(particleSpec, listOf(connection))

    @Test
    fun prettyPrintAccessPathRoot() {
        assertThat("${AccessPath.Root.Handle(handle)}").isEqualTo("h:thing")
        assertThat("${AccessPath.Root.HandleConnection(particle, connectionSpec)}")
            .isEqualTo("hc:Reader.data")
        assertThat("${AccessPath.Root.HandleConnectionSpec("Reader", connectionSpec)}")
            .isEqualTo("hcs:Reader.data")
    }

    @Test
    fun prettyPrintAccessPathSelector() {
        assertThat("${AccessPath.Selector.Field("foo")}").isEqualTo("foo")
    }

    @Test
    fun prettyPrintAccessPathNoSelectors() {
        assertThat("${AccessPath(handle)}").isEqualTo("h:thing")
        assertThat("${AccessPath(particle, connectionSpec)}").isEqualTo("hc:Reader.data")
    }

    @Test
    fun prettyPrintAccessPathWithSelectors() {
        val oneSelector = listOf(AccessPath.Selector.Field("bar"))
        val multipleSelectors = listOf(
            AccessPath.Selector.Field("foo"),
            AccessPath.Selector.Field("bar")
        )
        assertThat("${AccessPath(handle, oneSelector)}").isEqualTo("h:thing.bar")
        assertThat("${AccessPath(handle, multipleSelectors)}").isEqualTo("h:thing.foo.bar")
        assertThat("${AccessPath(particle, connectionSpec, oneSelector)}")
            .isEqualTo("hc:Reader.data.bar")
        assertThat("${AccessPath(particle, connectionSpec, multipleSelectors)}")
            .isEqualTo("hc:Reader.data.foo.bar")
        assertThat("${AccessPath("Reader", connectionSpec, oneSelector)}")
            .isEqualTo("hcs:Reader.data.bar")
        assertThat("${AccessPath("Reader", connectionSpec, multipleSelectors)}")
            .isEqualTo("hcs:Reader.data.foo.bar")
    }

    @Test
    fun instantiateForParticle_oneSelector() {
        val oneSelector = listOf(AccessPath.Selector.Field("bar"))
        val readerConnectionSpec = AccessPath("Reader", connectionSpec, oneSelector)
        val readerConnection = readerConnectionSpec.instantiateFor(particle)
        assertThat("$readerConnection").isEqualTo("hc:Reader.data.bar")
    }

    @Test
    fun instantiateForParticle_multipleSelectors() {
        val multipleSelectors = listOf(
            AccessPath.Selector.Field("foo"),
            AccessPath.Selector.Field("bar")
        )
        val readerConnectionSpecMultiple = AccessPath("Reader", connectionSpec, multipleSelectors)
        val readerConnectionMultiple = readerConnectionSpecMultiple.instantiateFor(particle)
        assertThat("$readerConnectionMultiple").isEqualTo("hc:Reader.data.foo.bar")
    }
}
