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

data class Capabilities(val capabilities: Set<Capability>) {
    fun isEmpty(): Boolean = capabilities.isEmpty()

    fun isSame(other: Capabilities): Boolean = capabilities.equals(other.capabilities)

    fun contains(other: Capabilities): Boolean = capabilities.containsAll(other.capabilities)

    fun isPersistent(): Boolean = capabilities.contains(Capability.Persistent)
    fun isTiedToRuntime(): Boolean = capabilities.contains(Capability.TiedToRuntime)
    fun isTiedToArc(): Boolean = capabilities.contains(Capability.TiedToArc)

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
