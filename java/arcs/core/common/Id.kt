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

package arcs.core.common

import arcs.core.util.Random
import arcs.core.util.nextSafeRandomLong

/** Convenience extension to convert a string to an [Id]. */
fun String.toId(): Id = Id.fromString(this)

/** An immutable identifier for a resource in Arcs. */
interface Id {
    /**
     * The session id from the particular session in which the [Id] was constructed.
     *
     * See [Id.Generator].
     */
    val root: String

    /**
     * A list of sub-components, forming a hierarchy of ids.
     *
     * Child [Id]s are created with the concatenation of their parent's [idTree] and their
     * sub-component's name.
     */
    val idTree: List<String>

    /** String representation of the [idTree]. */
    val idTreeString: String
        get() = idTree.joinToString(":")

    /**
     * Generates new [Id]s which are rooted in the current session.
     *
     * Only one [Generator] should be instantiated for each running Arc, and all of the [Id]s
     * created should be created using that same [Generator] instance.
     */
    class Generator constructor(
        /** Unique identifier for the session associated with this [Generator]. */
        val currentSessionId: String,
        private var nextComponentId: Int = 0
    ) {
        /** Returns the current session id. */
        fun getSessionId(): String = currentSessionId

        /** Creates a new [ArcId] as a child of the current session. */
        fun newArcId(name: String): ArcId = ArcId(currentSessionId, listOf(name), name)

        /**
         * Creates a new [Id], as a child of the given [parentId].
         *
         * The given [subComponent] will be appended to the component hierarchy of the given
         * [parentId], but the generator's random session id ([currentSessionId]) will be used as
         * the ID's root.
         */
        fun newChildId(parentId: Id, subComponent: String = ""): Id =
            IdImpl(currentSessionId, parentId.idTree + listOf("$subComponent${nextComponentId++}"))

        companion object {
            /** Creates a new random session id and returns a [Generator] using it. */
            fun newSession(): Generator = Generator(Random.nextSafeRandomLong().toString())

            /**
             * Creates a new [Generator] for use in testing.
             *
             * TODO: See if we can use android's @VisibleForTesting on the constructor instead of
             *   providing this.
             */
            fun newForTest(sessionId: String) = Generator(sessionId)
        }
    }

    companion object {
        /** Parses an [Id] from a [String], see [Id.toString]. */
        fun fromString(stringId: String): Id {
            require(stringId.isNotBlank()) { "Id string cannot be empty" }

            val bits = stringId.split(":")

            return if (bits[0].startsWith("!")) {
                IdImpl(bits[0].substring(1), bits.drop(1).filter { it.isNotBlank() })
            } else {
                IdImpl("", bits)
            }
        }
    }
}

/** Convenience to parse a [String] into an [ArcId]. */
fun String.toArcId(): ArcId = toId().let { ArcId(it.root, it.idTree, this) }

/** [Id] for an Arc. */
data class ArcId /* internal */ constructor(
    override val root: String,
    override val idTree: List<String>,
    val name: String
) : Id {
    override fun toString() = idToString(this)

    companion object {
        /**
         * Creates a new [ArcId] with the given [name].
         *
         * For convenience in unit testing only; otherwise use [Id.Generator] to create new IDs.
         *
         * TODO: See if we can use android's @VisibleForTesting on the constructor instead of
         *   providing this.
         */
        fun newForTest(name: String): ArcId = Id.Generator.newSession().newArcId(name)
    }
}

/* internal */ data class IdImpl(
    override val root: String,
    override val idTree: List<String> = emptyList()
) : Id {
    /** Returns the full ID string. */
    override fun toString() = idToString(this)
}

private fun idToString(id: Id): String = "!${id.root}:${id.idTreeString}"
