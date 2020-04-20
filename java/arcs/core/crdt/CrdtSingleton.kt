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

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtSet.Operation.Add
import arcs.core.crdt.CrdtSet.Operation.Remove
import arcs.core.crdt.CrdtSingleton.Data

/** A [CrdtModel] capable of managing a mutable reference. */
class CrdtSingleton<T : Referencable>(
    /** Function to construct a new, empty [Data] object with a given [VersionMap]. */
    dataBuilder: (VersionMap) -> Data<T> = { versionMap -> DataImpl(versionMap) },
    initialVersion: VersionMap = VersionMap(),
    initialData: T? = null,
    singletonToCopy: CrdtSingleton<T>? = null
) : CrdtModel<Data<T>, CrdtSingleton.IOperation<T>, T?> {
    override val versionMap: VersionMap
        get() = set._data.versionMap.copy()
    private var set: CrdtSet<T>

    override val data: Data<T>
        get() {
            val setData = set._data
            return DataImpl(setData.versionMap, setData.values)
        }
    override val consumerView: T?
        // Get any value, or null if no value is present.
        get() = set.consumerView.minBy { it.id }

    init {
        CrdtException.require(initialData == null || singletonToCopy == null) {
            "Cannot instantiate CrdtSingleton by supplying both initialData AND singletonToCopy"
        }
        set = when {
            initialData != null -> CrdtSet(
                DataImpl(
                    initialVersion,
                    mutableMapOf(initialData.id to CrdtSet.DataValue(initialVersion, initialData))
                )
            )
            singletonToCopy != null -> singletonToCopy.set.copy()
            else -> CrdtSet(DataImpl(initialVersion), dataBuilder)
        }
    }

    /**
     * Simple constructor to build a [CrdtSingleton] from an initial value and starting at a given
     * [VersionMap].
     */
    constructor(versionMap: VersionMap, data: T?) : this(
        initialVersion = versionMap,
        initialData = data
    )

    override fun merge(other: Data<T>): MergeChanges<Data<T>, IOperation<T>> {
        val result = set.merge(other)
        // Always return CrdtChange.Data change record for the local update, since we cannot perform
        // an op-based change.
        val modelChange: CrdtChange<Data<T>, IOperation<T>> = CrdtChange.Data(data)

        // If the other changes were empty, we should actually just return empty changes, rather
        // than the model..
        val otherChange: CrdtChange<Data<T>, IOperation<T>> = if (result.otherChange.isEmpty()) {
            CrdtChange.Operations(mutableListOf())
        } else {
            CrdtChange.Data(data)
        }

        return MergeChanges(modelChange, otherChange)
    }

    override fun applyOperation(op: IOperation<T>): Boolean = op.applyTo(set)

    override fun updateData(newData: Data<T>) = set.updateData(newData)

    /** Makes a deep copy of this [CrdtSingleton]. */
    /* internal */ fun copy(): CrdtSingleton<T> = CrdtSingleton(singletonToCopy = this)

    override fun toString(): String = "CrdtSingleton(data=${set.data})"

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null) return false
        if (this::class != other::class) return false

        other as CrdtSingleton<*>

        if (set != other.set) return false

        return true
    }

    override fun hashCode(): Int = set.hashCode()

    /** Abstract representation of the data stored by a [CrdtSingleton]. */
    interface Data<T : Referencable> : CrdtSet.Data<T> {
        override fun copy(): Data<T>
    }

    /** Concrete representation of the data stored by a [CrdtSingleton]. */
    data class DataImpl<T : Referencable>(
        override var versionMap: VersionMap = VersionMap(),
        override val values: MutableMap<ReferenceId, CrdtSet.DataValue<T>> = mutableMapOf()
    ) : Data<T> {
        override fun copy(): Data<T> =
            DataImpl(versionMap = VersionMap(versionMap), values = HashMap(values))
    }

    /** General representation of an operation which can be applied to a [CrdtSingleton]. */
    interface IOperation<T : Referencable> : CrdtOperationAtTime {
        val actor: Actor

        /** Mutates [data] based on the implementation of the [Operation]. */
        fun applyTo(set: CrdtSet<T>): Boolean
    }

    sealed class Operation<T : Referencable>(
        override val actor: Actor,
        override val clock: VersionMap
    ) : IOperation<T> {
        /** An [Operation] to update the value stored by the [CrdtSingleton]. */
        open class Update<T : Referencable>(
            override val actor: Actor,
            override val clock: VersionMap,
            val value: T
        ) : Operation<T>(actor, clock) {
            override fun applyTo(set: CrdtSet<T>): Boolean {
                // Remove does not require an increment, but the caller of this method will have
                // incremented its version, so we hack a version with t-1 for this actor.
                val removeClock = VersionMap(clock)
                removeClock[actor]--

                // If we can't remove all existing values, we can't update the value.
                if (!Clear<T>(actor, removeClock).applyTo(set)) return false

                // After removal of all existing values, we simply need to add the new value.
                return set.applyOperation(Add(actor, clock, value))
            }

            override fun equals(other: Any?): Boolean =
                other is Update<*> &&
                    other.clock == clock &&
                    other.actor == actor &&
                    other.value == value

            override fun hashCode(): Int = toString().hashCode()

            override fun toString(): String =
                "CrdtSingleton.Operation.Update($clock, $actor, $value)"
        }

        /** An [Operation] to clear the value stored by the [CrdtSingleton]. */
        open class Clear<T : Referencable>(
            override val actor: Actor,
            override val clock: VersionMap
        ) : Operation<T>(actor, clock) {
            override fun applyTo(set: CrdtSet<T>): Boolean {
                // Clear all existing values if our clock allows it.

                val removeOps = set.data.values
                    .map { (_, value) -> Remove(actor, clock, value.value) }

                removeOps.forEach { set.applyOperation(it) }
                return true
            }

            override fun equals(other: Any?): Boolean =
                other is Clear<*> &&
                    other.clock == clock &&
                    other.actor == actor

            override fun hashCode(): Int = toString().hashCode()

            override fun toString(): String = "CrdtSingleton.Operation.Clear($clock, $actor)"
        }
    }

    companion object {
        /** Creates a [CrdtSingleton] from pre-existing data. */
        fun <T : Referencable> createWithData(
            data: Data<T>,
            dataBuilder: (VersionMap) -> Data<T> = { DataImpl(it) }
        ) = CrdtSingleton(dataBuilder).apply { set = CrdtSet(data, dataBuilder) }
    }
}
