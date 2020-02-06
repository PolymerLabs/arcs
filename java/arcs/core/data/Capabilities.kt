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

/** A class containing a set of capabilities describing a store. */
data class Capabilities(val capabilities: Set<Capability>) {
    fun isEmpty(): Boolean = capabilities.isEmpty()

    fun contains(other: Capabilities): Boolean = capabilities.containsAll(other.capabilities)

    val isPersistent: Boolean
        get() = capabilities.contains(Capability.Persistent)
    val isTiedToRuntime: Boolean
        get() = capabilities.contains(Capability.TiedToRuntime)
    val isTiedToArc: Boolean
        get() = capabilities.contains(Capability.TiedToArc)

    enum class Capability {
        Persistent,
        TiedToRuntime,
        TiedToArc
    }

    companion object {
        val Persistent: Capabilities = Capabilities(setOf<Capability>(Capability.Persistent))
        val TiedToRuntime: Capabilities = Capabilities(setOf<Capability>(Capability.TiedToRuntime))
        val TiedToArc: Capabilities = Capabilities(setOf<Capability>(Capability.TiedToArc))
    }
}
