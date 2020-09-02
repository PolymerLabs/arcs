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

package arcs.core.crdt

/** A [CrdtModel] capable of managing an increasing [Int] value. */
class CrdtCount : CrdtModel<CrdtCount.Data, CrdtCount.Operation, Int> {
    private var _data: Data = Data()
    override val versionMap: VersionMap
        get() = _data.versionMap.copy()
    override val data: Data
        get() = _data.copy(values = HashMap(_data.values), versionMap = _data.versionMap.copy())

    override val consumerView: Int
        get() = _data.values.values.sum()

    fun forActor(actor: Actor) = Scoped(actor)

    override fun merge(other: Data): MergeChanges<Data, Operation> {
        val myChanges = CrdtChange.Operations<Data, Operation>()
        val otherChanges = CrdtChange.Operations<Data, Operation>()

        other.values.forEach { (actor, otherValue) ->
            val myValue = _data.values[actor] ?: 0
            val myVersion = _data.versionMap[actor]
            val otherVersion = other.versionMap[actor]

            if (myValue > otherValue) {
                if (otherVersion >= myVersion) {
                    throw CrdtException(
                        "Divergent versions encountered when merging CrdtCount models"
                    )
                }

                otherChanges +=
                    Operation.MultiIncrement(actor, otherVersion to myVersion, myValue - otherValue)
            } else if (otherValue > myValue) {
                if (myVersion >= otherVersion) {
                    throw CrdtException(
                        "Divergent versions encountered when merging CrdtCount models"
                    )
                }

                myChanges +=
                    Operation.MultiIncrement(actor, myVersion to otherVersion, otherValue - myValue)
                _data.values[actor] = otherValue
                _data.versionMap[actor] = otherVersion
            }
        }

        _data.values.forEach { (actor, myValue) ->
            if (actor in other.values) return@forEach
            if (actor in other.versionMap) {
                throw CrdtException("CrdtCount model has version but no value for actor: $actor")
            }

            otherChanges +=
                Operation.MultiIncrement(actor, 0 to _data.versionMap[actor], myValue)
        }

        return MergeChanges(myChanges, otherChanges)
    }

    override fun applyOperation(op: Operation): Boolean {
        val myVersionForActor = _data.versionMap[op.actor]

        if (op.version.from != myVersionForActor) return false

        val newValue = when (op) {
            is Operation.MultiIncrement -> {
                if (op.delta < 0) {
                    // TODO: Maybe this should throw a CrdtException.
                    return false
                }

                (_data.values[op.actor] ?: 0) + op.delta
            }
            is Operation.Increment -> (_data.values[op.actor] ?: 0) + 1
        }

        _data.values[op.actor] = newValue
        _data.versionMap[op.actor] = op.version.to

        return true
    }

    /** Scoped access to this [CrdtCount], where all ops will be marked as performed by [actor]. */
    inner class Scoped(private val actor: Actor) {
        private var currentVersion = _data.versionMap[actor]
        private var nextVersion = currentVersion + 1

        fun withCurrentVersion(version: Version) = apply { currentVersion = version }
        fun withNextVersion(version: Version) = apply { nextVersion = version }

        operator fun plusAssign(delta: Int) {
            applyOperation(
                Operation.MultiIncrement(actor, currentVersion to nextVersion, delta)
            )
        }
    }

    /** Internal representation of the count information. */
    data class Data(
        /** Increments seen from each actor. */
        val values: MutableMap<Actor, Int> = mutableMapOf(),
        /** Versions at each actor. */
        override var versionMap: VersionMap = VersionMap()
    ) : CrdtData

    /** Operation which can be performed on a [CrdtCount]. */
    sealed class Operation(
        open val actor: Actor,
        open val version: VersionInfo
    ) : CrdtOperation {
        /**
         * Increments the value by 1 for the given [actor] when going from one version to another
         * for that actor.
         */
        data class Increment(
            override val actor: Actor,
            override val version: VersionInfo
        ) : Operation(actor, version)

        /**
         * Increments the value by some positive integer [delta] for the given [actor] when going
         * from one version to another for that actor.
         */
        data class MultiIncrement(
            override val actor: Actor,
            override val version: VersionInfo,
            val delta: Int
        ) : Operation(actor, version) {
            init {
                require(delta > 0)
            }
        }
    }
}

/** Pair of versions. */
private typealias VersionInfo = Pair<Int, Int>

val VersionInfo.from: Int
    get() = first
val VersionInfo.to: Int
    get() = second
