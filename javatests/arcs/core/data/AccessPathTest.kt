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
    private val handle = Recipe.Handle("thing", Recipe.Handle.Fate.CREATE, TypeVariable("thing"))
    private val connectionSpec = HandleConnectionSpec("data", HandleMode.Read, TypeVariable("data"))
    private val connection = Recipe.Particle.HandleConnection(connectionSpec, handle, TypeVariable("thing"))
    private val particleSpec = ParticleSpec("Reader", mapOf("data" to connectionSpec), "Location")
    private val particle = Recipe.Particle(particleSpec, listOf(connection))
    private val oneSelector = listOf(AccessPath.Selector.Field("foo"))
    private val multipleSelectors = listOf(
        AccessPath.Selector.Field("foo"),
        AccessPath.Selector.Field("bar")
    )

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
        assertThat("${AccessPath(handle, oneSelector)}").isEqualTo("h:thing.foo")
        assertThat("${AccessPath(handle, multipleSelectors)}").isEqualTo("h:thing.foo.bar")
        assertThat("${AccessPath(particle, connectionSpec, oneSelector)}")
            .isEqualTo("hc:Reader.data.foo")
        assertThat("${AccessPath(particle, connectionSpec, multipleSelectors)}")
            .isEqualTo("hc:Reader.data.foo.bar")
        assertThat("${AccessPath("Reader", connectionSpec, oneSelector)}")
            .isEqualTo("hcs:Reader.data.foo")
        assertThat("${AccessPath("Reader", connectionSpec, multipleSelectors)}")
            .isEqualTo("hcs:Reader.data.foo.bar")
    }

    @Test
    fun instantiateForParticle_oneSelector() {
        val readerConnectionSpec = AccessPath("Reader", connectionSpec, oneSelector)
        val readerConnection = readerConnectionSpec.instantiateFor(particle)
        assertThat("$readerConnection").isEqualTo("hc:Reader.data.foo")
    }

    @Test
    fun instantiateForParticle_multipleSelectors() {
        val readerConnectionSpecMultiple = AccessPath("Reader", connectionSpec, multipleSelectors)
        val readerConnectionMultiple = readerConnectionSpecMultiple.instantiateFor(particle)
        assertThat("$readerConnectionMultiple").isEqualTo("hc:Reader.data.foo.bar")
    }

    @Test
    fun isPrefixOf_comparesRoots() {
        val handleAccessPath = AccessPath(handle, oneSelector)
        val particleAccessPath = AccessPath(particle, connectionSpec, oneSelector)
        assertThat(handleAccessPath.isPrefixOf(particleAccessPath)).isFalse()
        assertThat(particleAccessPath.isPrefixOf(handleAccessPath)).isFalse()

        val handleAccessPathMultiple = AccessPath(handle, multipleSelectors)
        val particleAccessPathMultiple = AccessPath(particle, connectionSpec, multipleSelectors)
        assertThat(handleAccessPathMultiple.isPrefixOf(particleAccessPathMultiple)).isFalse()
        assertThat(particleAccessPathMultiple.isPrefixOf(handleAccessPathMultiple)).isFalse()
    }

    @Test
    fun isPrefixOf_comparesSelectors() {
        val anotherSelector = listOf(AccessPath.Selector.Field("baz"))
        val handleAccessPath = AccessPath(handle, oneSelector)
        val handleAccessPathMultiple = AccessPath(handle, multipleSelectors)
        val handleAccessPathAnother = AccessPath(handle, anotherSelector)

        with(handleAccessPath) {
            assertThat(isPrefixOf(handleAccessPath)).isTrue()
            assertThat(isPrefixOf(handleAccessPathMultiple)).isTrue()
            assertThat(isPrefixOf(handleAccessPathAnother)).isFalse()
        }
        with(handleAccessPathMultiple) {
            assertThat(isPrefixOf(handleAccessPath)).isFalse()
            assertThat(isPrefixOf(handleAccessPathMultiple)).isTrue()
            assertThat(isPrefixOf(handleAccessPathAnother)).isFalse()
        }
        with(handleAccessPathAnother) {
            assertThat(isPrefixOf(handleAccessPath)).isFalse()
            assertThat(isPrefixOf(handleAccessPathMultiple)).isFalse()
            assertThat(isPrefixOf(handleAccessPathAnother)).isTrue()
        }
    }
}
