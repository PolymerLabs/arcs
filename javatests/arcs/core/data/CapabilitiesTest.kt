/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CapabilitiesTest]. */
@RunWith(JUnit4::class)
class CapabilitiesTest {
    @Test
    fun capabilities_verifiesSame() {
        assertTrue(Capabilities.Persistent.isSame(Capabilities.Persistent))
        assertTrue(Capabilities.TiedToRuntime.isSame(Capabilities.TiedToRuntime))
        assertTrue(Capabilities.TiedToArc.isSame(Capabilities.TiedToArc))

        assertFalse(Capabilities.Persistent.isSame(Capabilities.TiedToRuntime))
        assertFalse(Capabilities.TiedToRuntime.isSame(Capabilities.TiedToArc))
        assertFalse(Capabilities.TiedToArc.isSame(Capabilities.Persistent))


        assertTrue(Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc)).isSame(
                Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc))))
        assertFalse(Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc)).isSame(
                Capabilities(setOf(Capabilities.Capability.Persistent))))
        assertFalse(Capabilities.Persistent.isSame(
                Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc))))
    }

    @Test
    fun capabilities_verifiesContains() {
        assertTrue(Capabilities.Persistent.contains(Capabilities.Persistent))
        assertTrue(Capabilities.TiedToRuntime.contains(Capabilities.TiedToRuntime))
        assertTrue(Capabilities.TiedToArc.contains(Capabilities.TiedToArc))

        assertFalse(Capabilities.Persistent.contains(Capabilities.TiedToRuntime))
        assertFalse(Capabilities.TiedToRuntime.contains(Capabilities.TiedToArc))
        assertFalse(Capabilities.TiedToArc.contains(Capabilities.Persistent))

        assertTrue(Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc)).contains(
                Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc))))
        assertTrue(Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc)).contains(
                Capabilities(setOf(Capabilities.Capability.Persistent))))
        assertFalse(Capabilities.Persistent.contains(
                Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc))))
    }
}
