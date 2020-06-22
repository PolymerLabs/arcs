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

    operator fun contains(other: Capabilities): Boolean {
        if (other.isEmpty()) return isEmpty()
        return capabilities.containsAll(other.capabilities)
    }

    /** Whether the store needs to be persistent */
    val isPersistent: Boolean
        get() = capabilities.contains(Capability.Persistent)
    /** Whether the store needs to be queryable */
    val isQueryable: Boolean
        get() = capabilities.contains(Capability.Queryable)
    /** Whether the store needs to be in-memory and shared across all Arcs (e.g. ramdisk) */
    val isTiedToRuntime: Boolean
        get() = capabilities.contains(Capability.TiedToRuntime)
    /** Whether the store needs to be in-memory and private to the Arc (e.g. volatile) */
    val isTiedToArc: Boolean
        get() = capabilities.contains(Capability.TiedToArc)

    enum class Capability {
        Persistent,
        Queryable,
        TiedToRuntime,
        TiedToArc
    }

    companion object {
        const val PERSISTENT = "persistent"
        const val QUERYABLE = "queryable"
        const val TTL = "ttl"
        const val TIED_TO_RUNTIME = "tiedToRuntime"
        const val TIED_TO_ARC = "tiedToArc"

        /** Helper constants with useful capability variants. */
        val Empty: Capabilities = Capabilities(emptySet())
        val Persistent: Capabilities = Capabilities(setOf<Capability>(Capability.Persistent))
        val Queryable: Capabilities = Capabilities(setOf<Capability>(Capability.Queryable))
        val PersistentQueryable: Capabilities = Capabilities(
            setOf<Capability>(Capability.Persistent, Capability.Queryable)
        )
        val TiedToRuntime: Capabilities = Capabilities(setOf<Capability>(Capability.TiedToRuntime))
        val TiedToArc: Capabilities = Capabilities(setOf<Capability>(Capability.TiedToArc))

        fun fromAnnotations(annotations: List<Annotation>): Capabilities {
            val capabilities = mutableSetOf<Capability>()
            annotations.forEach {
                when (it.name) {
                    PERSISTENT -> capabilities.add(Capability.Persistent)
                    QUERYABLE, TTL -> capabilities.add(Capability.Queryable)
                    TIED_TO_RUNTIME -> capabilities.add(Capability.TiedToRuntime)
                    TIED_TO_ARC -> capabilities.add(Capability.TiedToArc)
                }
            }
            return Capabilities(capabilities)
        }
    }
}
