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

@file:Suppress("RemoveRedundantQualifierName")

package arcs.core.crdt

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtChange.Operations
import arcs.core.crdt.CrdtSet.Data
import arcs.core.data.util.ReferencablePrimitive

/**
 * A [CrdtModel] capable of managing a set of items [T].
 *
 * The implementation is based on the optimized OR-Set as described in:
 *
 * Annette Bieniusa, Marek Zawirski, Nuno Preguiça, Marc Shapiro,
 * Carlos Baquero, Valter Balegas, Sérgio Duarte,
 * "An Optimized Conflict-free Replicated Set" (2012)
 *
 * https://arxiv.org/abs/1210.3368
 */
class CrdtSet<T : Referencable>(
    /** Initial data. */
    /* internal */ var _data: Data<T> = DataImpl()
) : CrdtModel<Data<T>, CrdtSet.IOperation<T>, Set<T>> {

    override val versionMap: VersionMap
        get() = _data.versionMap.copy()
    override val data: Data<T>
        get() = _data.copy()

    override val consumerView: Set<T>
        get() = HashSet<T>().apply { addAll(_data.values.values.map { it.value }) }

    override fun merge(other: Data<T>): MergeChanges<Data<T>, IOperation<T>> {
        val oldClock = _data.versionMap.copy()
        val newClock = _data.versionMap mergeWith other.versionMap
        val mergedData = DataImpl<T>(newClock)
        val fastForwardOp = Operation.FastForward<T>(other.versionMap, newClock)

        other.values.values.forEach { (otherVersion: VersionMap, otherValue: T) ->
            val id = otherValue.id
            val myEntry = _data.values[id]

            if (myEntry != null) {
                val (myVersion, myValue) = myEntry

                if (myVersion == otherVersion) {
                    // Both models have the same value at the same version. Add it to the merge.
                    mergedData.values[id] = myEntry
                } else {
                    // Models have different versions for the same value. Merge the versions,
                    // and update other.
                    DataValue(
                        myVersion mergeWith otherVersion,
                        myValue
                    ).also {
                        mergedData.values[id] = it
                        fastForwardOp.added += it
                    }
                }
            } else if (_data.versionMap dominates otherVersion) {
                // Value was deleted by this model.
                fastForwardOp.removed += otherValue
            } else {
                // Value was added by the other model.
                mergedData.values[id] = DataValue(otherVersion, otherValue)
            }
        }

        _data.values.forEach { (id, myEntry) ->
            if (id !in other.values && other.versionMap doesNotDominate myEntry.versionMap) {
                // Value was added by this model.
                mergedData.values[id] = myEntry
                fastForwardOp.added += myEntry
            }
        }

        val otherOperations = if (
            fastForwardOp.added.isNotEmpty() ||
            fastForwardOp.removed.isNotEmpty() ||
            oldClock doesNotDominate newClock
        ) {
            Operations<Data<T>, IOperation<T>>(fastForwardOp.simplify().toMutableList())
        } else {
            Operations<Data<T>, IOperation<T>>(mutableListOf())
        }

        val myChange = if (mergedData == this._data) {
            Operations<Data<T>, IOperation<T>>(mutableListOf())
        } else {
            CrdtChange.Data<Data<T>, IOperation<T>>(mergedData)
        }

        this._data = mergedData

        return MergeChanges(
            modelChange = myChange, otherChange = otherOperations
        )
    }

    override fun applyOperation(op: IOperation<T>): Boolean = op.applyTo(_data)

    /** Checks whether or not a given [Operation] will succeed. */
    @Suppress("unused")
    fun canApplyOperation(op: Operation<T>): Boolean = op.applyTo(_data, isDryRun = true)

    override fun updateData(newData: Data<T>) {
        _data = DataImpl(newData.versionMap, newData.values.toMutableMap())
    }

    /** Makes a deep copy of this [CrdtSet]. */
    /* internal */ fun copy(): CrdtSet<T> = CrdtSet(
        DataImpl(_data.versionMap.copy(), HashMap(_data.values))
    )

    override fun toString(): String = "CrdtSet($_data)"

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null) return false
        if (this::class != other::class) return false

        other as CrdtSet<*>

        if (_data != other._data) return false

        return true
    }

    override fun hashCode(): Int = _data.hashCode()

    /** Abstract representation of the data managed by [CrdtSet]. */
    interface Data<T : Referencable> : CrdtData {
        val values: MutableMap<ReferenceId, DataValue<T>>

        /** Constructs a deep copy of this [Data]. */
        fun copy(): Data<T>
    }

    /** Representation of the data managed by [CrdtSet]. */
    data class DataImpl<T : Referencable>(
        override var versionMap: VersionMap = VersionMap(),
        /** Map of values by their [ReferenceId]s. */
        override val values: MutableMap<ReferenceId, DataValue<T>> = mutableMapOf()
    ) : Data<T> {
        override fun copy() = DataImpl(
            versionMap = VersionMap(versionMap),
            values = HashMap(values)
        )

        override fun toString(): String =
            "CrdtSet.Data(versionMap=$versionMap, values=${values.toStringRepr()})"

        private fun <T : Referencable> Map<ReferenceId, DataValue<T>>.toStringRepr(): String =
            entries.joinToString(prefix = "{", postfix = "}") { (id, value) ->
                "${ReferencablePrimitive.unwrap(id) ?: id}=$value"
            }
    }

    /** A particular datum within a [CrdtSet]. */
    data class DataValue<T : Referencable>(
        /** The 'time' when the item was added. */
        val versionMap: VersionMap,
        /** The actual value of the datum. */
        val value: T
    ) {
        override fun toString(): String = "$value@Version$versionMap"
    }

    /** Generic Operation applicable to [CrdtSet]. */
    interface IOperation<T : Referencable> : CrdtOperationAtTime {
        /** Performs the operation on the specified [DataImpl] instance. */
        fun applyTo(data: Data<T>, isDryRun: Boolean = false): Boolean
    }

    /** Operations which can be performed on a [CrdtSet]. */
    sealed class Operation<T : Referencable> : IOperation<T> {
        /**
         * Represents an addition of a new item into a [CrdtSet] and returns whether or not the
         * operation could be applied.
         */
        open class Add<T : Referencable>(
            val actor: Actor,
            override val clock: VersionMap,
            val added: T
        ) : Operation<T>() {
            override fun applyTo(data: Data<T>, isDryRun: Boolean): Boolean {
                // Only accept an add if it is immediately consecutive to the clock for that actor.
                if (clock[actor] != data.versionMap[actor] + 1) return false

                // No need to edit actual data during a dry run.
                if (isDryRun) return true

                data.versionMap[actor] = clock[actor]
                val previousVersion = data.values[added.id]?.versionMap ?: VersionMap()
                data.values[added.id] = DataValue(clock mergeWith previousVersion, added)
                return true
            }

            override fun equals(other: Any?): Boolean =
                other is Add<*> &&
                    other.clock == clock &&
                    other.actor == actor &&
                    other.added == added

            override fun hashCode(): Int = toString().hashCode()

            override fun toString(): String = "CrdtSet.Operation.Add($clock, $actor, $added)"
        }

        /** Represents the removal of an item from a [CrdtSet]. */
        open class Remove<T : Referencable>(
            val actor: Actor,
            override val clock: VersionMap,
            val removed: T
        ) : Operation<T>() {
            override fun applyTo(data: Data<T>, isDryRun: Boolean): Boolean {
                // Can't remove an item that doesn't exist.
                val existingDatum = data.values[removed.id] ?: return false

                // Ensure the remove op doesn't change the clock value.
                if (clock[actor] != data.versionMap[actor]) return false

                // Can't remove the item unless the clock value dominates that of the item already
                // in the set.
                if (clock doesNotDominate existingDatum.versionMap) return false

                // No need to edit actual data during a dry run.
                if (isDryRun) return true

                data.versionMap[actor] = clock[actor]
                data.values.remove(removed.id)
                return true
            }

            override fun equals(other: Any?): Boolean =
                other is Remove<*> &&
                    other.clock == clock &&
                    other.actor == actor &&
                    other.removed == removed

            override fun hashCode(): Int = toString().hashCode()

            override fun toString(): String = "CrdtSet.Operation.Remove($clock, $actor, $removed)"
        }

        /** Represents a batch operation to catch one [CrdtSet] up with another. */
        data class FastForward<T : Referencable>(
            val oldClock: VersionMap,
            val newClock: VersionMap,
            val added: MutableList<DataValue<T>> = mutableListOf(),
            val removed: MutableList<T> = mutableListOf()
        ) : Operation<T>() {
            override val clock: VersionMap = newClock

            override fun applyTo(data: Data<T>, isDryRun: Boolean): Boolean {
                // Can't fast-forward when current data's clock is behind oldClock.
                if (data.versionMap doesNotDominate oldClock) return false

                // If the current data already knows about everything in the fast-forward op, we
                // don't have to do anything.
                if (data.versionMap dominates newClock) return true

                // No need to edit actual data during a dry run.
                if (isDryRun) return true

                added.forEach { (addedClock: VersionMap, addedValue: T) ->
                    val existingValue = data.values[addedValue.id]
                    if (existingValue != null) {
                        data.values[addedValue.id] =
                            DataValue(
                                addedClock mergeWith existingValue.versionMap, existingValue.value
                            )
                    } else if (data.versionMap doesNotDominate addedClock) {
                        data.values[addedValue.id] = DataValue(addedClock, addedValue)
                    }
                }

                removed.forEach { removedValue: T ->
                    val existingValue = data.values[removedValue.id]
                    if (existingValue != null && newClock dominates existingValue.versionMap) {
                        data.values.remove(removedValue.id)
                    }
                }

                data.versionMap = data.versionMap mergeWith newClock
                return true
            }

            /**
             * Simplifies a [FastForward] operation, if possible.
             *
             * Converts a simple fast-forward operation into a sequence of regular ops.
             *
             * **Note:** Currently only supports converting add ops made by a single actor. Returns
             * a list containing this [FastForward] op if it could not simplify.
             */
            fun simplify(): List<Operation<T>> {
                // Remove ops can't be replayed in order.
                if (removed.isNotEmpty()) return listOf(this)

                // This is just a version bump, since there are no additions and no removals.
                if (added.isEmpty()) return listOf(this)

                // Can only return a simplified list of ops if all additions come from a single
                // actor.
                val versionDiff = newClock - oldClock
                if (versionDiff.size != 1) return listOf(this)
                val actor = versionDiff.actors.first()

                val sortedAdds = added.sortedBy { it.versionMap[actor] }
                var expectedVersion = oldClock[actor]
                sortedAdds.forEach { (itemVersion: VersionMap, _) ->
                    // The add op's version for the actor wasn't just an increment-by-one from the
                    // previous version.
                    if (++expectedVersion != itemVersion[actor]) return listOf(this)
                }

                val expectedClock = VersionMap(oldClock).also { it[actor] = expectedVersion }

                // If the final clock does not match an increment-by-one approach for each addition
                // for the actor, we can't simplify.
                if (expectedClock != newClock) return listOf(this)

                return added.map { Add(actor, it.versionMap, it.value) }
            }
        }
    }

    companion object {
        /** Creates a [CrdtSet] from pre-existing data. */
        fun <T : Referencable> createWithData(data: Data<T>) = CrdtSet(data)
    }
}
