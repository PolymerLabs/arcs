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

/** Tests for [Capabilities]. */
@RunWith(JUnit4::class)
class CapabilitiesTest {
    @Test
    fun capabilities_verifiesContains() {
        assertThat(Capabilities.Empty.contains(Capabilities.Empty)).isTrue()
        assertThat(Capabilities.Persistent.contains(Capabilities.Persistent)).isTrue()
        assertThat(Capabilities.Persistent in Capabilities.Persistent).isTrue()
        assertThat(Capabilities.Persistent !in Capabilities.Persistent).isFalse()
        assertThat(Capabilities.TiedToRuntime.contains(Capabilities.TiedToRuntime)).isTrue()
        assertThat(Capabilities.TiedToArc.contains(Capabilities.TiedToArc)).isTrue()

        assertThat(Capabilities.Empty.contains(Capabilities.Persistent)).isFalse()
        assertThat(Capabilities.Persistent.contains(Capabilities.Empty)).isFalse()
        assertThat(Capabilities.Persistent.contains(Capabilities.TiedToRuntime)).isFalse()
        assertThat(Capabilities.TiedToRuntime.contains(Capabilities.TiedToArc)).isFalse()
        assertThat(Capabilities.TiedToArc.contains(Capabilities.Persistent)).isFalse()

        assertThat(Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc)).contains(
                Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc)))
        ).isTrue()
        assertThat(Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc)).contains(
                Capabilities(setOf(Capabilities.Capability.Persistent)))
        ).isTrue()
        assertThat(Capabilities.Persistent.contains(
                Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc)))
        ).isFalse()
    }
    @Test
    fun capabilities_fromAnnotations() {
        assertThat(Capabilities.fromAnnotations(emptyList())).isEqualTo(Capabilities.Empty)
        assertThat(Capabilities.fromAnnotations(listOf(Annotation("justAnnotation"))))
            .isEqualTo(Capabilities.Empty)

        assertThat(Capabilities.fromAnnotations(
            listOf(
                Annotation.createCapability(Capabilities.PERSISTENT)
            )
        )).isEqualTo(Capabilities.Persistent)
        assertThat(Capabilities.fromAnnotations(
            listOf(
                Annotation.createCapability(Capabilities.PERSISTENT),
                Annotation("justAnnotation")
            )
        )).isEqualTo(Capabilities.Persistent)
        assertThat(Capabilities.fromAnnotations(
            listOf(
                Annotation.createCapability(Capabilities.QUERYABLE)
            )
        )).isEqualTo(Capabilities.Queryable)
        assertThat(Capabilities.fromAnnotations(
            listOf(
                Annotation.createCapability(Capabilities.TIED_TO_RUNTIME)
            )
        )).isEqualTo(Capabilities.TiedToRuntime)
        assertThat(Capabilities.fromAnnotations(
            listOf(
                Annotation.createCapability(Capabilities.TIED_TO_ARC)
            )
        )).isEqualTo(Capabilities.TiedToArc)
        assertThat(Capabilities.fromAnnotations(
            listOf(
                Annotation.createCapability(Capabilities.PERSISTENT),
                Annotation.createCapability(Capabilities.QUERYABLE)
            )
        )).isEqualTo(Capabilities.PersistentQueryable)
        assertThat(Capabilities.fromAnnotations(listOf(Annotation.createTtl("3 days"))))
            .isEqualTo(Capabilities.Queryable)
        assertThat(Capabilities.fromAnnotations(
            listOf(
                Annotation.createCapability(Capabilities.PERSISTENT),
                Annotation.createTtl("10 minutes")
            )
        )).isEqualTo(Capabilities.PersistentQueryable)  
    }
}
