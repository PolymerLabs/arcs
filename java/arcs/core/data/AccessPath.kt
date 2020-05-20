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

/**
 * Specifies an access path in a claim or a check.
 *
 * Examples of access paths are `input.app.packageName`, `store.rawText`, store.entites[i], etc.
 */
data class AccessPath(val root: Root, val selectors: List<Selector> = emptyList()) {
    /**
     * Constructs an [AccessPath] starting at a connection in [particle] identified
     * by [connectionSpec] followed by [selectors].
     */
    constructor(
        particle: Recipe.Particle,
        connectionSpec: HandleConnectionSpec,
        selectors: List<Selector> = emptyList()
    ) : this(Root.HandleConnection(particle, connectionSpec), selectors)

    /** Constructs an [AccessPath] representing a [ParticleSpec.HandleConnectionSpec]. */
    constructor(
        particleSpecName: String,
        connectionSpec: HandleConnectionSpec,
        selectors: List<Selector> = emptyList()
    ) : this(Root.HandleConnectionSpec(particleSpecName, connectionSpec), selectors)

    /** Constructs an [AccessPath] representing a [Recipe.Handle]. */
    constructor(
        handle: Recipe.Handle,
        selectors: List<Selector> = emptyList()
    ) : this(Root.Handle(handle), selectors)

    /**
     * Represents the root of an [AccessPath].
     *
     * Some examples of roots are as follows:
     *     `input` is the root of `input.app.packageName`
     *     `store` is the root of `store.rawText`
     */
    sealed class Root {
        data class Handle(val handle: Recipe.Handle) : Root() {
            override fun toString() = "h:${handle.name}"
        }

        data class HandleConnection(
            val particle: Recipe.Particle,
            val connectionSpec: arcs.core.data.HandleConnectionSpec
        ) : Root() {
            override fun toString() = "hc:${particle.spec.name}.${connectionSpec.name}"
        }

        data class HandleConnectionSpec(
            val particleSpecName: String,
            val connectionSpec: arcs.core.data.HandleConnectionSpec
        ) : Root() {
            override fun toString() = "hcs:$particleSpecName.${connectionSpec.name}"
        }
        // TODO(bgogul): Store, etc.
    }

    /** Represents an access to a part of the data (like a field). */
    sealed class Selector {
        data class Field(val field: FieldName) : Selector() {
            override fun toString() = "$field"
        }
        // TODO(bgogul): Indexing, Dereferencing(?).
    }

    override fun toString(): String {
        if (selectors.isEmpty()) return "$root"
        return selectors.joinToString(separator = ".", prefix = "$root.")
    }

    /**
     * Converts an [AccessPath] with [Root.HandleConnectionSpec] as root into a
     * [AccessPath] with the corresponding [Root.HandleConnection] as root.
     */
    fun instantiateFor(particle: Recipe.Particle): AccessPath {
        if (root !is Root.HandleConnectionSpec) return this
        require (particle.spec.name == root.particleSpecName) {
            "Instantiating an access path for an incompatible particle!"
        }
        return AccessPath(Root.HandleConnection(particle, root.connectionSpec), selectors)
    }
}
